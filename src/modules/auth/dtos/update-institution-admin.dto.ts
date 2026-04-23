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
import { Transform } from 'class-transformer';

export class UpdateInstitutionAdminDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  institutionAdminId: number;

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
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ValidateIf(
    (o: UpdateInstitutionAdminDto) => o.email !== undefined && o.email !== null,
  )
  @IsString()
  @Length(6, 6)
  otp?: string;

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

  @IsOptional()
  profilePicture?: Express.Multer.File;
}
