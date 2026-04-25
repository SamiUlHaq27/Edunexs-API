import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  CreateFeeDto,
  DeleteFeeDto,
  UpdateFeeDto,
  CreatePaymentIntentDto,
  ConfirmPaymentDto,
} from './dtos';
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
  @AllowedRoles([UserRoles.STUDENT, UserRoles.PARENT])
  @Post('student/all')
  async listStudentFees(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.feeService.listStudentFees(listFiltersDto, user);
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

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT, UserRoles.PARENT])
  @Post('payment/create-intent')
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @User() user: UserData,
  ) {
    return await this.feeService.createPaymentIntent(
      createPaymentIntentDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT, UserRoles.PARENT])
  @Post('payment/confirm')
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @User() user: UserData,
  ) {
    return await this.feeService.confirmPayment(confirmPaymentDto, user);
  }
}
