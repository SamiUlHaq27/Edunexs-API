import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ListStudentAttendanceDto {
  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  size: number;

  @IsOptional()
  @IsInt()
  offeringId?: number;

  @IsOptional()
  @IsInt()
  studentProfileId?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  periodSlot?: string;
}
