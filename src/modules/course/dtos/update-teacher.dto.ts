import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTeacherDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  teacherId: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password?: string;

  @IsOptional()
  profilePicture?: Express.Multer.File;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
