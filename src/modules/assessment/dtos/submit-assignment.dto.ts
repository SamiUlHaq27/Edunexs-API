import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class SubmitAssignmentDto {
  @IsInt()
  @Type(() => Number)
  assignmentId: number;
}
