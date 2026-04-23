import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class TeacherStudentGradesDto {
  @IsInt()
  @Type(() => Number)
  offeringId: number;

  @IsInt()
  @Type(() => Number)
  studentProfileId: number;
}
