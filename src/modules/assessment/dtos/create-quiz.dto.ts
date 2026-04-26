import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuizQuestionDto {
  @IsString()
  @MaxLength(100)
  id: string;

  @IsString()
  @MaxLength(1000)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  options: string[];

  @IsInt()
  @Type(() => Number)
  @Min(0)
  correctOptionIndex: number;
}

export class CreateQuizDto {
  @IsInt()
  @Type(() => Number)
  offeringId: number;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  maxAttempts: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions: CreateQuizQuestionDto[];
}
