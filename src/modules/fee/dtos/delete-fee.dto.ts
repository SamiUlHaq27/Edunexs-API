import { IsInt } from 'class-validator';

export class DeleteFeeDto {
  @IsInt()
  feeId: number;
}
