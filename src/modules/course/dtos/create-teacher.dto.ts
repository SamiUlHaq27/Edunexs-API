import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @IsUUID()
  profilePictureFileId: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;
}
