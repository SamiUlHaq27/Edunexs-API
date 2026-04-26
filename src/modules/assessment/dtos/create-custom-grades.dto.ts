import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomGradeStudentEntryDto {
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

export class CreateCustomGradesDto {
  @IsInt()
  @Type(() => Number)
  offeringId: number;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  maxGrade: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomGradeStudentEntryDto)
  grades: CustomGradeStudentEntryDto[];
}
