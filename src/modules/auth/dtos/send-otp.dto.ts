import { IsEmail, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { OtpTypeEnum } from 'src/database/entities/otp.entity';

export class SendOtpDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsOptional()
  @IsEnum(OtpTypeEnum)
  type?: OtpTypeEnum = OtpTypeEnum.SIGNUP;
}
