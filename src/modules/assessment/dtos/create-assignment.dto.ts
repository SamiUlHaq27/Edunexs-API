import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AssessmentTypes } from 'src/database/entities';

export class CreateAssignmentDto {
  @IsInt()
  @Type(() => Number)
  offeringId: number;

  @IsIn([AssessmentTypes.ASSIGNMENT, AssessmentTypes.QUIZ])
  @IsOptional()
  assessmentType?: (typeof AssessmentTypes)[keyof typeof AssessmentTypes];

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  dueDate: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Type(() => Number)
  maxGrade: number;
}
