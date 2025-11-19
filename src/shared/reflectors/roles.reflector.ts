import { Reflector } from '@nestjs/core';
import { UserRoleEnum } from '../enums';

export const AllowedRoles = Reflector.createDecorator<UserRoleEnum[]>();
