import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateStaffDto {
  @IsInt()
  staffId: number;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
