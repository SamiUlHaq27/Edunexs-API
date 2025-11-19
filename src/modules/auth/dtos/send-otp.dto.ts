import { IsEmail, MaxLength } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  @MaxLength(320)
  email: string;
}
