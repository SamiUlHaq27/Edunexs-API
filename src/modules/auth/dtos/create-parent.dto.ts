import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateParentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  studentProfileIds: number[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
