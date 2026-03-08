import { IsInt } from 'class-validator';

export class DeleteStudentDto {
  @IsInt()
  studentId: number;
}
