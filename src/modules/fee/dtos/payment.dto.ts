import { Type } from 'class-transformer';
import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsInt()
  @Type(() => Number)
  feeId: number;

  @IsString()
  @IsNotEmpty()
  currency: string = 'pkr';
}

export class ConfirmPaymentDto {
  @IsInt()
  @Type(() => Number)
  feeId: number;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
