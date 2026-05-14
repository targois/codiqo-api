import { Injectable } from '@nestjs/common';
import { UserLessonProgress } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string): Promise<UserLessonProgress[]> {
    return this.prisma.userLessonProgress.findMany({ where: { userId } });
  }

  findForLesson(userId: string, lessonId: string): Promise<UserLessonProgress | null> {
    return this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  }
}
