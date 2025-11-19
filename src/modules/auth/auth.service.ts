import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthEntity } from 'src/database/entities/auth.entity';
import {
  OtpEntity,
  OtpStatusEnum,
  OtpTypeEnum,
} from 'src/database/entities/otp.entity';
import { UserRoleEnum } from 'src/shared/enums';
import { SignupDto, LoginDto } from './dtos';
import { createHash, randomInt } from 'crypto';
import { UserData } from 'src/shared/types';
import { BrevoService } from 'src/shared/services/brevo.service';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AuthService {
  private logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
    private readonly jwtService: JwtService,
    private readonly brevoService: BrevoService,
  ) {}

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private generateOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  private getEmailTemplate(name: string, otp: string): string {
    const templatePath = join(
      process.cwd(),
      'src',
      'shared',
      'emails',
      'signup_otp.template.html',
    );
    const template = readFileSync(templatePath, 'utf-8');
    return template.replace('{{name}}', name).replace('{{otp}}', otp);
  }

  private getWelcomeEmailTemplate(
    name: string,
    email: string,
    username: string,
  ): string {
    const templatePath = join(
      process.cwd(),
      'src',
      'shared',
      'emails',
      'welcome.template.html',
    );
    const template = readFileSync(templatePath, 'utf-8');
    return template
      .replace(/{{name}}/g, name)
      .replace(/{{email}}/g, email)
      .replace(/{{username}}/g, username);
  }

  async signup(signupDto: SignupDto) {
    const { email, password, name, profilePictureUrl, otp } = signupDto;

    // Verify OTP first
    const otpRecord = await this.otpRepository.findOne({
      where: {
        email,
        otp,
        type: OtpTypeEnum.SIGNUP,
        status: OtpStatusEnum.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check if OTP has expired
    if (otpRecord?.expiresAt && new Date() > otpRecord.expiresAt) {
      otpRecord.status = OtpStatusEnum.EXPIRED;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('OTP has expired');
    }

    // Check if user already exists
    const existingUser = await this.authRepository.findOne({
      where: { username: email },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = this.hashPassword(password);

    // Create new user with institution_owner role by default
    const newUser = this.authRepository.create({
      username: email,
      password: hashedPassword,
      name,
      profilePictureUrl,
      role: UserRoleEnum.INSITUTION_OWNER,
      isActive: true,
    });

    try {
      const savedUser = await this.authRepository.save(newUser);

      // Mark OTP as verified
      otpRecord.status = OtpStatusEnum.VERIFIED;
      await this.otpRepository.save(otpRecord);

      // Send welcome email
      try {
        const welcomeHtml = this.getWelcomeEmailTemplate(
          savedUser.name || savedUser.username,
          savedUser.username,
          savedUser.username,
        );
        await this.brevoService.sendEmail({
          to: [
            {
              email: savedUser.username,
              name: savedUser.name || savedUser.username,
            },
          ],
          subject: 'Welcome to Edunexs! 🎓',
          htmlContent: welcomeHtml,
        });
      } catch (error) {
        this.logger.error('Failed to send welcome email', error);
        // Don't throw error, continue with signup
      }

      // Generate JWT token
      const payload: UserData = {
        authId: savedUser.id,
        username: savedUser.username,
        role: savedUser.role,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: savedUser?.id,
          username: savedUser?.username,
          name: savedUser?.name,
          profilePictureUrl: savedUser?.profilePictureUrl,
          role: savedUser?.role,
          isActive: savedUser?.isActive,
          createdAt: savedUser?.createdAt,
        },
      };
    } catch {
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async login(loginDto: LoginDto) {
    const { username, email, password } = loginDto;

    // Validate that at least username or email is provided
    if (!username && !email) {
      throw new BadRequestException(
        'Either username or email must be provided',
      );
    }

    // Use email as username if username is not provided
    const usernameToSearch = username || email;

    // Find user
    const user = await this.authRepository.findOne({
      where: { username: usernameToSearch },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user?.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const hashedPassword = this.hashPassword(password);
    if (user?.password !== hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: UserData = {
      authId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user?.id,
        username: user?.username,
        name: user?.name,
        profilePictureUrl: user?.profilePictureUrl,
        role: user?.role,
        isActive: user?.isActive,
        createdAt: user?.createdAt,
      },
    };
  }

  async sendOtp(email: string) {
    // Check if email already exists in auth entity
    const existingUser = await this.authRepository.findOne({
      where: { username: email },
    });

    if (existingUser) {
      throw new ConflictException('Email already used with another account');
    }

    const name = email.split('@')[0];

    // Generate OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const otpRecord = this.otpRepository.create({
      email,
      otp,
      type: OtpTypeEnum.SIGNUP,
      status: OtpStatusEnum.PENDING,
      expiresAt,
    });

    await this.otpRepository.save(otpRecord);

    // Get email template
    const htmlContent = this.getEmailTemplate(name, otp);

    // Send email via Brevo
    try {
      await this.brevoService.sendEmail({
        to: [{ email, name }],
        subject: 'Verify Your Email - Edunexs',
        htmlContent,
      });

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt,
      };
    } catch (e) {
      this.logger.error(
        'Failed to send OTP email',
        e instanceof Error ? e.message : '',
      );
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }
}
