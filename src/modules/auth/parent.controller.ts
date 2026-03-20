import { Body, Controller, Post, Put, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { CreateParentLoginDto, ResetParentPasswordDto } from './dtos';
import { ParentService } from './services';

@Controller('parent')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createParentLogin(
    @Body() createParentLoginDto: CreateParentLoginDto,
    @User() user: UserData,
  ) {
    return await this.parentService.createParentLogin(
      createParentLoginDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put('reset-password')
  async resetParentPassword(
    @Body() resetParentPasswordDto: ResetParentPasswordDto,
    @User() user: UserData,
  ) {
    return await this.parentService.resetParentPassword(
      resetParentPasswordDto,
      user,
    );
  }
}
