import {
  IsBoolean,
  IsString,
  MinLength,
  MaxLength,
  Length,
} from 'class-validator';

export class UpdateInstitutionStatusDto {
  @IsString()
  @Length(2, 10)
  prefix: string;

  @IsBoolean()
  isBlocked: boolean;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  message: string;
}
