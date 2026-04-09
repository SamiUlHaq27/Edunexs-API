import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class GradeAssignmentDto {
  @IsInt()
  @Type(() => Number)
  assignmentId: number;

  @IsInt()
  @Type(() => Number)
  studentProfileId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  score: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  feedback?: string;
}
