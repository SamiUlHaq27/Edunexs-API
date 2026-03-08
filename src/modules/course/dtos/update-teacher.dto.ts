import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTeacherDto {
  @IsInt()
  teacherId: number;

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
  @IsUUID()
  profilePictureFileId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recoveryEmail?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
