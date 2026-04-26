import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ListTeacherAttendanceDto {
  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  size: number;

  @IsInt()
  offeringId: number;

  @IsOptional()
  @IsDateString()
  attendanceDate?: string;

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

  @IsOptional()
  @IsInt()
  studentProfileId?: number;
}
