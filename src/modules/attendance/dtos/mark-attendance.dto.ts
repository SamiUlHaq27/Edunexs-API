import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from 'src/database/entities/attendance.entity';

export class MarkAttendanceRecordDto {
  @IsInt()
  studentProfileId: number;

  @IsIn([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT])
  status: (typeof AttendanceStatus)[keyof typeof AttendanceStatus];
}

export class MarkAttendanceDto {
  @IsInt()
  offeringId: number;

  @IsDateString()
  attendanceDate: string;

  @IsString()
  @MaxLength(50)
  periodSlot: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkAttendanceRecordDto)
  records: MarkAttendanceRecordDto[];
}
