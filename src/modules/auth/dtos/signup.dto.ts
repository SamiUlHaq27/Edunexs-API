import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Length,
} from 'class-validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(50)
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
