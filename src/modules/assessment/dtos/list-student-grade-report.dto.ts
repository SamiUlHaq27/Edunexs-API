import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { GradeTypes } from 'src/database/entities';

const StudentGradeTypes = [
  GradeTypes.ASSIGNMENT,
  GradeTypes.QUIZ,
  GradeTypes.CUSTOM,
] as const;

export class ListStudentGradeReportDto {
  @IsInt()
  @Type(() => Number)
  page: number;

  @IsInt()
  @Type(() => Number)
  size: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  offeringId?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  studentProfileId?: number;

  @IsIn([...StudentGradeTypes])
  @IsOptional()
  assessmentType?: (typeof StudentGradeTypes)[number];
}
