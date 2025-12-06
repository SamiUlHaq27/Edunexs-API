import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInstitutionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  prefix: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  country: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  address: string;
}
