import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  prefix?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
