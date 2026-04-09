import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListStudentQuizGradesDto {
  @IsInt()
  @Type(() => Number)
  page: number;

  @IsInt()
  @Type(() => Number)
  size: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  offeringId?: number;
}
