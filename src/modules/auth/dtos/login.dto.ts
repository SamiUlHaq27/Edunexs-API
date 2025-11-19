import { IsEmail, IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  username?: string;

  @ValidateIf((o: LoginDto) => !o.username)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
