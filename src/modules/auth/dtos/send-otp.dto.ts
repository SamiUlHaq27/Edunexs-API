import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { OtpTypes } from 'src/shared/consts';
import type { OtpTypesType } from 'src/shared/types/otp.type';

export class SendOtpDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsOptional()
  @IsIn(Object.values(OtpTypes))
  type?: OtpTypesType = OtpTypes.SIGNUP;
}
