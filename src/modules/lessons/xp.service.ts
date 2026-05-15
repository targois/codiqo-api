import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface AwardXpOptions {
  userId: string;
  amount: number;
  reason: string;
  lessonId?: string;
  currentXp: number;
}

@Injectable()
export class XpService {
  static level(totalXp: number): number {
    return Math.floor(totalXp / 100) + 1;
  }

  async awardInTx(
    tx: Prisma.TransactionClient,
    opts: AwardXpOptions,
  ): Promise<{ newXp: number; newLevel: number }> {
    const newXp = opts.currentXp + opts.amount;
    const newLevel = XpService.level(newXp);

    await tx.user.update({
      where: { id: opts.userId },
      data: { xp: { increment: opts.amount }, level: newLevel },
    });

    await tx.xPTransaction.create({
      data: {
        userId: opts.userId,
        amount: opts.amount,
        reason: opts.reason,
        ...(opts.lessonId ? { lessonId: opts.lessonId } : {}),
      },
    });

    return { newXp, newLevel };
  }
}
