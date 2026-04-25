import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class StudentQuizDetailDto {
  @IsInt()
  @Type(() => Number)
  quizId: number;
}
