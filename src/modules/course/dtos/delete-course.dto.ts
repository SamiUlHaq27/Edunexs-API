import { IsInt } from 'class-validator';

export class DeleteCourseDto {
  @IsInt()
  courseId: number;
}
