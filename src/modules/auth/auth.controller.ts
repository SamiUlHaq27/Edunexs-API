import {
  Body,
  Controller,
  Post,
  Get,
  Version,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, ResetPasswordDto } from './dtos';
import { SendOtpDto } from './dtos/send-otp.dto';
import { UploadFileDto } from './dtos/upload-file';
import { GetFileDto } from './dtos/get-file.dto';
import { User } from 'src/shared/pipes';

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
  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Version('1')
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Version('1')
  @Post('upload-profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @User('authId') authId: number,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.authService.uploadFile(authId, file, uploadDto);
  }

  @Version('1')
  @Get('me')
  async getCurrentUser(@User('authId') authId: number) {
    return this.authService.getCurrentUser(authId);
  }

  @Version('1')
  @Get('file')
  async getFile(@Query() params: GetFileDto) {
    return this.authService.getFileUrl(params.fileId);
  }
}
