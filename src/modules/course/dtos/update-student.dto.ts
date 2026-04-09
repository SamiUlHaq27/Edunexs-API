import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStudentDto {
  @IsInt()
  studentId: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  rollNo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  grade?: string;

  @IsOptional()
  profilePicture?: Express.Multer.File;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
