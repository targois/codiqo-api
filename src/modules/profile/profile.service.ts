import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        onboarding: true,
        _count: {
          select: {
            progress: { where: { isCompleted: true } },
          },
        },
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      selectedLanguage: user.onboarding?.selectedLanguage ?? null,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      completedLessons: user._count.progress,
      isOnboardingComplete: user.isOnboardingComplete,
      createdAt: user.createdAt,
    };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const taken = await this.prisma.user.findFirst({
        where: { username: dto.username, NOT: { id: userId } },
      });
      if (taken) throw new ConflictException('Username is already taken');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: {
        onboarding: true,
        _count: { select: { progress: { where: { isCompleted: true } } } },
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      selectedLanguage: user.onboarding?.selectedLanguage ?? null,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      completedLessons: user._count.progress,
      isOnboardingComplete: user.isOnboardingComplete,
      createdAt: user.createdAt,
    };
  }

  logout() {
    // JWT is stateless — token removal happens on the client side.
    // A future implementation can add a token blacklist here.
    return { success: true };
  }
}
