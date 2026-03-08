import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
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

  @IsUUID()
  @IsOptional()
  profilePictureFileId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;
}
