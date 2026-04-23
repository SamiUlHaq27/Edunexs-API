import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @IsOptional()
  profilePicture?: Express.Multer.File;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;
}
