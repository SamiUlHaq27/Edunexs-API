import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AllowedRoles } from '../reflectors';
import { AppRequest } from '../types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AppRequest>();

    const requiredRoles = this.reflector.get(
      AllowedRoles,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const userRole = request.user?.role;

    if (!userRole) {
      return false; // No user role found, deny access
    }

    return requiredRoles.includes(userRole);
  }
}
