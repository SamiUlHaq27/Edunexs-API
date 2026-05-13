import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteTeacherAssignmentDto {
  @IsInt()
  @Type(() => Number)
  assignmentId: number;

  // When true, remove associated grades, submissions and files permanently
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hard?: boolean;
}
