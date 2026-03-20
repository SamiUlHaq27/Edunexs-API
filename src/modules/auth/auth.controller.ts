import {
  Body,
  Controller,
  Post,
  Version,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './services';
import { SignupDto, LoginDto, ResetPasswordDto, ParentLoginDto } from './dtos';
import { SendOtpDto } from './dtos/send-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Version('1')
  @Post('signup')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async signup(
    @Body() signupDto: SignupDto,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return this.authService.signup(signupDto, profilePicture);
  }

  @Version('1')
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Version('1')
  @Post('parent/login')
  async parentLogin(@Body() parentLoginDto: ParentLoginDto) {
    return this.authService.parentLogin(parentLoginDto);
  }

  @Version('1')
  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Version('1')
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
