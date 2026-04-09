import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateParentLoginDto {
  @IsInt()
  studentId: number;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
