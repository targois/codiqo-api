import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { leagueForXp } from '../../leagues/leagues';

export interface FriendshipView {
  id: string;
  status: FriendshipStatus;
  direction: 'sent' | 'received';
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  createdAt: Date;
}

export interface FriendProgressView {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: number;
  completedLessons: number;
  currentLeague: string;
}

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // POST /api/friends/request
  async sendRequest(requesterId: string, username: string) {
    const addressee = await this.prisma.user.findUnique({ where: { username } });
    if (!addressee) throw new NotFoundException('User not found');
    if (addressee.id === requesterId) {
      throw new BadRequestException('Cannot befriend yourself');
    }

    // If a friendship already exists in either direction, surface it instead
    // of creating a duplicate. ACCEPTED → conflict, PENDING → conflict,
    // REJECTED → allow a fresh request from the rejecter side.
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId },
        ],
      },
    });
    if (existing && existing.status !== FriendshipStatus.REJECTED) {
      throw new ConflictException(
        `Friendship already exists in status ${existing.status}`,
      );
    }
    if (existing && existing.status === FriendshipStatus.REJECTED) {
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId,
          addresseeId: addressee.id,
          status: FriendshipStatus.PENDING,
        },
      });
    }

    return this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: addressee.id,
        status: FriendshipStatus.PENDING,
      },
    });
  }

  // POST /api/friends/accept | reject
  async respond(
    userId: string,
    friendshipId: string,
    status: FriendshipStatus,
  ) {
    const fr = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!fr) throw new NotFoundException('Friendship not found');
    if (fr.addresseeId !== userId) {
      throw new ForbiddenException('Only the addressee can respond to this request');
    }
    if (fr.status !== FriendshipStatus.PENDING) {
      throw new ConflictException(`Friendship is already ${fr.status}`);
    }
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status },
    });
  }

  // GET /api/friends — list of accepted friendships
  // GET /api/friends/pending — pending requests for/from this user
  async list(userId: string, status: FriendshipStatus): Promise<FriendshipView[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => {
      const other = r.requesterId === userId ? r.addressee : r.requester;
      return {
        id: r.id,
        status: r.status,
        direction: r.requesterId === userId ? 'sent' : 'received',
        user: other,
        createdAt: r.createdAt,
      };
    });
  }

  // GET /api/friends/progress
  async progress(userId: string): Promise<FriendProgressView[]> {
    const accepted = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });
    if (accepted.length === 0) return [];

    const friendIds = accepted.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    const friends = await this.prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        xp: true,
        level: true,
        streak: true,
        _count: { select: { progress: { where: { isCompleted: true } } } },
      },
    });

    return friends.map((f) => ({
      username: f.username,
      displayName: f.displayName,
      avatarUrl: f.avatarUrl,
      xp: f.xp,
      level: f.level,
      streak: f.streak,
      completedLessons: f._count.progress,
      currentLeague: leagueForXp(f.xp),
    }));
  }
}
