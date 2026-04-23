import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FeeStatus } from 'src/database/entities/fee.entity';

export class UpdateFeeDto {
  @IsInt()
  feeId: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'OVERDUE'])
  status?: FeeStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsInt()
  studentProfileId?: number;
}
