import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class DeleteQuizDto {
  @IsInt()
  @Type(() => Number)
  quizId: number;
}
