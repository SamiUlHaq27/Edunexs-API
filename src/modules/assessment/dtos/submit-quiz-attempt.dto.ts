import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SubmitQuizAnswerDto {
  @IsString()
  @MaxLength(100)
  questionId: string;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  selectedOptionIndex: number;
}

export class SubmitQuizAttemptDto {
  @IsInt()
  @Type(() => Number)
  quizId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers: SubmitQuizAnswerDto[];
}
