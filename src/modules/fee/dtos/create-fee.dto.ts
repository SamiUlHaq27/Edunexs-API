import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FeeStatus } from 'src/database/entities/fee.entity';

export class CreateFeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsInt()
  @Min(200)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'OVERDUE'])
  status?: FeeStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  studentProfileIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  studentGroupIds?: number[];
}
