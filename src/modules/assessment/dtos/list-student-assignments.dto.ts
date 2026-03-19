import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import {
  AssignmentSubmissionStatus,
  AssessmentTypes,
} from 'src/database/entities';

export class ListStudentAssignmentsDto {
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

  @IsIn([
    AssignmentSubmissionStatus.SUBMITTED,
    AssignmentSubmissionStatus.GRADED,
    'not_submitted',
  ])
  @IsOptional()
  submissionStatus?:
    | (typeof AssignmentSubmissionStatus)[keyof typeof AssignmentSubmissionStatus]
    | 'not_submitted';
}
