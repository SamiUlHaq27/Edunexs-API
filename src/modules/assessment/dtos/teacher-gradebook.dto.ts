import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class TeacherGradebookDto {
  @IsInt()
  @Type(() => Number)
  offeringId: number;
}
