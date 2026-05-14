import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

// Usage: @CurrentUser() user: Omit<User, 'passwordHash'>
// Passport puts the validated user object on req.user after JwtAuthGuard runs.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Omit<User, 'passwordHash'> => {
    const request = ctx.switchToHttp().getRequest<{ user: Omit<User, 'passwordHash'> }>();
    return request.user;
  },
);
