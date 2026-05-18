import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCollabChallengeDto,
  JoinCollabChallengeDto,
} from './dto/collaborative-challenge.dto';

export interface CollabChallengeView {
  id: string;
  title: string;
  xpGoal: number;
  totalXp: number;
  progressPercent: number;
  expiresAt: Date;
  isExpired: boolean;
  isCompleted: boolean;
  myContribution: number;
  participants: { username: string; contributedXp: number }[];
}

@Injectable()
export class CollaborativeChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  // POST /api/challenges/create — creator auto-joins as a participant.
  async create(userId: string, dto: CreateCollabChallengeDto) {
    if (dto.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
    const challenge = await this.prisma.collaborativeChallenge.create({
      data: {
        title: dto.title,
        xpGoal: dto.xpGoal,
        expiresAt: dto.expiresAt,
        participants: { create: { userId } },
      },
    });
    return challenge;
  }

  // POST /api/challenges/join — joining an expired challenge is rejected so
  // users don't accidentally lock themselves into a dead goal.
  async join(userId: string, dto: JoinCollabChallengeDto) {
    const challenge = await this.prisma.collaborativeChallenge.findUnique({
      where: { id: dto.challengeId },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Challenge has expired');
    }

    try {
      return await this.prisma.collaborativeChallengeParticipant.create({
        data: { userId, challengeId: challenge.id },
      });
    } catch (err: unknown) {
      // P2002 = unique violation → user already joined.
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Already joined this challenge');
      }
      throw err;
    }
  }

  // GET /api/challenges — everything this user participates in, with totals.
  // Each participant's `contributedXp` is the sum of XPTransactions they
  // earned in the challenge's window (createdAt → expiresAt).
  async listForUser(userId: string): Promise<CollabChallengeView[]> {
    const participations = await this.prisma.collaborativeChallengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: {
          include: {
            participants: { include: { user: { select: { username: true } } } },
          },
        },
      },
      orderBy: { challenge: { expiresAt: 'asc' } },
    });

    const results: CollabChallengeView[] = [];
    for (const p of participations) {
      const challenge = p.challenge;
      const participants = await Promise.all(
        challenge.participants.map(async (part) => ({
          username: part.user.username,
          contributedXp: await this.sumXpInWindow(
            part.userId,
            challenge.createdAt,
            challenge.expiresAt,
          ),
        })),
      );
      const totalXp = participants.reduce((acc, x) => acc + x.contributedXp, 0);
      const myContribution =
        participants.find((part) => part.username === participantUsername(p.userId, challenge.participants))
          ?.contributedXp ?? 0;
      results.push({
        id: challenge.id,
        title: challenge.title,
        xpGoal: challenge.xpGoal,
        totalXp,
        progressPercent: Math.min(100, Math.round((totalXp / challenge.xpGoal) * 100)),
        expiresAt: challenge.expiresAt,
        isExpired: challenge.expiresAt.getTime() <= Date.now(),
        isCompleted: totalXp >= challenge.xpGoal,
        myContribution,
        participants,
      });
    }
    return results;
  }

  private async sumXpInWindow(userId: string, from: Date, to: Date): Promise<number> {
    const upperBound = to.getTime() > Date.now() ? new Date() : to;
    const agg = await this.prisma.xPTransaction.aggregate({
      where: { userId, createdAt: { gte: from, lte: upperBound } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }
}

function participantUsername(
  userId: string,
  parts: { userId: string; user: { username: string } }[],
): string | null {
  return parts.find((p) => p.userId === userId)?.user.username ?? null;
}
