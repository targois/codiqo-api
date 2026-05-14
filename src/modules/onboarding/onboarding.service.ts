import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Onboarding } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOnboardingDto): Promise<Onboarding> {
    const existing = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Onboarding already completed');
    }

    const [onboarding] = await this.prisma.$transaction([
      this.prisma.onboarding.create({
        data: { userId, ...dto, isCompleted: true },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { isOnboardingComplete: true },
      }),
    ]);

    return onboarding;
  }

  async findByUser(userId: string): Promise<Onboarding | null> {
    return this.prisma.onboarding.findUnique({ where: { userId } });
  }

  async update(userId: string, dto: UpdateOnboardingDto): Promise<Onboarding> {
    const existing = await this.findByUser(userId);
    if (!existing) throw new NotFoundException('Onboarding not found');

    return this.prisma.onboarding.update({
      where: { userId },
      data: dto,
    });
  }
}
