import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import type { AppRequest, UserData } from '../types';

export const User = createParamDecorator(
  (data: keyof UserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    const user = request.user;

    if (!user) {
      throw new BadRequestException('User data not found in request');
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
