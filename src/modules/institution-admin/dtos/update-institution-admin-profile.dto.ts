import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateInstitutionAdminProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ValidateIf(
    (o: UpdateInstitutionAdminProfileDto) =>
      o.email !== undefined && o.email !== null,
  )
  @IsString()
  @Length(6, 6)
  otp?: string;
}
