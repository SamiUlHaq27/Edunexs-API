import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  rollNo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  grade: string;

  @IsOptional()
  profilePicture?: Express.Multer.File;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;
}
