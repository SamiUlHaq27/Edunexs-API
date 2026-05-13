import {
  IsBoolean,
  IsInt,
  IsString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateInstitutionStatusDto {
  @IsInt()
  @Min(1)
  institutionId: number;

  @IsBoolean()
  isBlocked: boolean;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  message: string;
}
