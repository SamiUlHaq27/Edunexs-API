import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListQuizAttemptsDto {
  @IsInt()
  @Type(() => Number)
  quizId: number;

  @IsInt()
  @Type(() => Number)
  page: number;

  @IsInt()
  @Type(() => Number)
  size: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  studentProfileId?: number;
}
