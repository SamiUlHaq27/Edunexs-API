import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional } from 'class-validator';
import { AssignmentSubmissionStatus } from 'src/database/entities';

export class ListAssignmentSubmissionsDto {
  @IsInt()
  @Type(() => Number)
  assignmentId: number;

  @IsInt()
  @Type(() => Number)
  page: number;

  @IsInt()
  @Type(() => Number)
  size: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  studentProfileId?: number;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isLate?: boolean;

  @IsIn([
    AssignmentSubmissionStatus.SUBMITTED,
    AssignmentSubmissionStatus.GRADED,
  ])
  @IsOptional()
  status?: (typeof AssignmentSubmissionStatus)[keyof typeof AssignmentSubmissionStatus];
}
