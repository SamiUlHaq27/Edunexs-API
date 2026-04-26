import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCourseDto {
  @IsInt()
  courseId: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
