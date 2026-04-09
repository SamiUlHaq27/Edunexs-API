import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { AssessmentTypes } from 'src/database/entities/assignment.entity';

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

  @IsIn([
    AssessmentTypes.ASSIGNMENT,
    AssessmentTypes.QUIZ,
    AssessmentTypes.EXAM,
  ])
  @IsOptional()
  assessmentType?: (typeof AssessmentTypes)[keyof typeof AssessmentTypes];
}
