import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStaffProfileDto,
  DeleteStaffDto,
} from './dtos';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoleEnum } from 'src/shared/enums';
import { User } from 'src/shared/pipes';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Post()
  async create(
    @Body() createStaffDto: CreateStaffDto,
    @User('authId') authId: number,
  ) {
    return await this.staffService.create(createStaffDto, authId);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Post('all')
  async findAll(
    @Body() listFiltersDto: ListFiltersDto,
    @User('authId') authId: number,
  ) {
    return await this.staffService.findAll(authId, listFiltersDto);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Put()
  async update(
    @Body() updateStaffDto: UpdateStaffDto,
    @User('authId') authId: number,
  ) {
    return await this.staffService.update(
      updateStaffDto.staffId,
      updateStaffDto,
      authId,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Delete()
  async delete(
    @Body() deleteStaffDto: DeleteStaffDto,
    @User('authId') authId: number,
  ) {
    return await this.staffService.delete(deleteStaffDto.staffId, authId);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.STAFF])
  @Put('profile/me')
  async updateProfile(
    @Body() updateStaffProfileDto: UpdateStaffProfileDto,
    @User('authId') authId: number,
  ) {
    return await this.staffService.updateProfile(authId, updateStaffProfileDto);
  }
}
