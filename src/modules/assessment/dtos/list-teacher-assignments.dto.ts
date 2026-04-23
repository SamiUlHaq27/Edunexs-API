import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AssessmentTypes } from 'src/database/entities';

export class ListTeacherAssignmentsDto {
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

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsIn([AssessmentTypes.ASSIGNMENT, AssessmentTypes.QUIZ])
  @IsOptional()
  assessmentType?: (typeof AssessmentTypes)[keyof typeof AssessmentTypes];

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean;
}
