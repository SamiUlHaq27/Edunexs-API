import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  MinLength,
  Min,
  ValidateIf,
  IsOptional,
} from 'class-validator';

export class LoginDto {
  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  username?: string;

  @ValidateIf((o: LoginDto) => !!o.username)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  institutionId?: number;

  @ValidateIf((o: LoginDto) => !o.username)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
