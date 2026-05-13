import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class DeleteTeacherGradeDto {
  @IsInt()
  @Type(() => Number)
  gradeId: number;
}
