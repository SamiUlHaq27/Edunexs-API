import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateStaffProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  profilePictureUrl?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ValidateIf((o) => o.email !== undefined && o.email !== null)
  @IsString()
  @Length(6, 6)
  otp?: string;
}
