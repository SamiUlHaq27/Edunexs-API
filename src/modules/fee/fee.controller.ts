import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { CreateFeeDto, DeleteFeeDto, UpdateFeeDto } from './dtos';
import { FeeService } from './services';

@Controller('fee')
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Post()
  async createFee(@Body() createFeeDto: CreateFeeDto, @User() user: UserData) {
    return await this.feeService.createFee(createFeeDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Post('all')
  async listFees(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.feeService.listFees(listFiltersDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Put()
  async updateFee(@Body() updateFeeDto: UpdateFeeDto, @User() user: UserData) {
    return await this.feeService.updateFee(updateFeeDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Delete()
  async deleteFee(@Body() deleteFeeDto: DeleteFeeDto, @User() user: UserData) {
    return await this.feeService.deleteFee(deleteFeeDto, user);
  }
}
