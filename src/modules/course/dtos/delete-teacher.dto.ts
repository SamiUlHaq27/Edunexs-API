import { IsInt } from 'class-validator';

export class DeleteTeacherDto {
  @IsInt()
  teacherId: number;
}
