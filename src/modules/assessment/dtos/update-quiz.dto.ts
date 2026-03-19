import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateQuizQuestionDto } from './create-quiz.dto';

export class UpdateQuizDto {
  @IsInt()
  @Type(() => Number)
  quizId: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  maxAttempts?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  @IsOptional()
  questions?: CreateQuizQuestionDto[];

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean;
}
