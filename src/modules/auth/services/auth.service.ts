import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthEntity } from 'src/database/entities/auth.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { InstitutionEntity } from 'src/database/entities/institution.entity';
import { OtpEntity } from 'src/database/entities/otp.entity';
import {
  ParentLoginEntity,
  ParentStudentEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { OtpStatuses, OtpTypes, UserRoles } from 'src/shared/consts';
import {
  SignupDto,
  LoginDto,
  ResetPasswordDto,
  UploadFileDto,
  ParentLoginDto,
} from '../dtos';
import { randomInt } from 'crypto';
import { UserData } from 'src/shared/types';
import { hashPassword } from 'src/shared/helpers';
import { BrevoService } from 'src/shared/services/brevo.service';
import { AppwriteStorageService } from 'src/shared/services/appwrite-storage.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import { OtpTypesType } from 'src/shared/types/otp.type';

@Injectable()
export class AuthService {
  private logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(ParentLoginEntity)
    private readonly parentLoginRepository: Repository<ParentLoginEntity>,
    @InjectRepository(ParentStudentEntity)
    private readonly parentStudentRepository: Repository<ParentStudentEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    private readonly jwtService: JwtService,
    private readonly brevoService: BrevoService,
    private readonly appwriteStorageService: AppwriteStorageService,
  ) {}

  private buildProfilePictureResponse(file?: FileEntity | null) {
    if (!file) return null;
    return {
      dbFileId: file.id,
      appwriteFileId: file.fileId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeOriginal: file.sizeOriginal,
      publicUrl: this.appwriteStorageService.getFileViewUrl({
        fileId: file.fileId,
      }),
    };
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
    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    return template({ name, otp });
  }

  private getResetPasswordEmailTemplate(name: string, otp: string): string {
    const templatePath = join(
      process.cwd(),
      'src',
      'shared',
      'emails',
      'reset_password_otp.template.html',
    );
    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    return template({ name, otp });
  }

  private getWelcomeEmailTemplate(name: string, email: string): string {
    const templatePath = join(
      process.cwd(),
      'src',
      'shared',
      'emails',
      'welcome.template.html',
    );
    const templateSource = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    return template({ name, email });
  }

  /**
   * Verify OTP for signup or password reset
   * @param email Email address
   * @param otp OTP code
   * @param type OTP type (SIGNUP or PASSWORD_RESET)
   * @returns OTP record if valid
   * @throws BadRequestException if OTP is invalid or expired
   */
  private async verifyOtp(
    email: string,
    otp: string,
    type: OtpTypesType,
  ): Promise<OtpEntity> {
    // Find OTP record
    const otpRecord = await this.otpRepository.findOne({
      where: {
        email,
        otp,
        type,
        status: OtpStatuses.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check if OTP has expired
    if (otpRecord?.expiresAt && new Date() > otpRecord.expiresAt) {
      otpRecord.status = OtpStatuses.EXPIRED;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('OTP has expired');
    }

    return otpRecord;
  }

  async signup(signupDto: SignupDto, profilePictureFile?: Express.Multer.File) {
    const { email, password, name, otp } = signupDto;

    // Verify OTP first
    const otpRecord = await this.verifyOtp(email, otp, OtpTypes.SIGNUP);

    // Check if user already exists
    const existingUser = await this.authRepository.findOne({
      where: { email: email },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    let uploadedProfileFile: FileEntity | undefined;
    if (profilePictureFile) {
      const maxFileSize = 5 * 1024 * 1024;
      if (profilePictureFile.size > maxFileSize) {
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      try {
        const uploadResult = await this.appwriteStorageService.uploadFile({
          file: profilePictureFile.buffer,
          fileName: profilePictureFile.originalname,
          mimeType: profilePictureFile.mimetype,
        });

        const fileRecord = this.fileRepository.create({
          fileName: uploadResult.fileName,
          fileId: uploadResult.fileId,
          mimeType: uploadResult.mimeType,
          sizeOriginal: uploadResult.sizeOriginal,
        });

        uploadedProfileFile = await this.fileRepository.save(fileRecord);
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to upload profile picture: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    // Create new user with institution_owner role by default
    const newUser = this.authRepository.create({
      email: email,
      password: hashedPassword,
      name,
      role: UserRoles.INSTITUTION_OWNER,
      isActive: true,
      ...(uploadedProfileFile && {
        profilePictureFile: { id: uploadedProfileFile.id } as FileEntity,
      }),
    });

    try {
      const savedUser = await this.authRepository.save(newUser);

      // Mark OTP as verified
      otpRecord.status = OtpStatuses.VERIFIED;
      await this.otpRepository.save(otpRecord);

      // Send welcome email
      try {
        const welcomeHtml = this.getWelcomeEmailTemplate(
          savedUser.name || savedUser.email,
          savedUser.email,
        );
        await this.brevoService.sendEmail({
          to: [
            {
              email: savedUser.email,
              name: savedUser.name || savedUser.email,
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
        username: savedUser.email,
        role: savedUser.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const profilePictureEntity = uploadedProfileFile || null;

      return {
        accessToken,
        user: {
          id: savedUser?.id,
          username: savedUser?.email,
          name: savedUser?.name,
          profilePicture:
            this.buildProfilePictureResponse(profilePictureEntity),
          role: savedUser?.role,
          isActive: savedUser?.isActive,
          createdAt: savedUser?.createdAt,
        },
      };
    } catch (error) {
      if (uploadedProfileFile) {
        try {
          await this.appwriteStorageService.deleteFile(
            uploadedProfileFile.fileId,
          );
          await this.fileRepository.delete(uploadedProfileFile.id);
        } catch {
          // Best effort cleanup for pre-uploaded profile picture.
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async login(loginDto: LoginDto) {
    const { username, institutionPrefix, email, password } = loginDto;

    // Validate that at least username or email is provided
    if (!username && !email) {
      throw new BadRequestException(
        'Either username or email must be provided',
      );
    }

    let user: AuthEntity | null = null;

    if (username) {
      // Username login requires institution prefix
      if (!institutionPrefix) {
        throw new BadRequestException(
          'Institution prefix is required for username login',
        );
      }

      user = await this.authRepository.findOne({
        where: {
          username: username,
          institution: { prefix: institutionPrefix },
        },
        relations: ['profilePictureFile', 'institution'],
      });
    } else if (email) {
      // Email login: query globally
      user = await this.authRepository.findOne({
        where: { email: email },
        relations: ['profilePictureFile', 'institution'],
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user?.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user?.password !== hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: UserData = {
      authId: user.id,
      username: user.email,
      role: user.role,
      institutionId: user?.institution?.prefix,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user?.id,
        username: user?.email,
        name: user?.name,
        profilePicture: this.buildProfilePictureResponse(
          user?.profilePictureFile,
        ),
        role: user?.role,
        institutionId: user?.institution?.prefix,
        isActive: user?.isActive,
        createdAt: user?.createdAt,
      },
    };
  }

  async parentLogin(parentLoginDto: ParentLoginDto) {
    const { username, institutionPrefix, password } = parentLoginDto;

    // Support two flows:
    // 1. New flow: institutionPrefix + username (explicit)
    // 2. Legacy flow: username with prefix (e.g., "inst_username")

    let parentAuth: AuthEntity | null = null;
    let linkedStudentIds: number[] = [];

    if (institutionPrefix && username) {
      // New flow: explicit institution prefix and username
      parentAuth = await this.authRepository.findOne({
        where: {
          username,
          role: UserRoles.PARENT,
          institution: { prefix: institutionPrefix },
        },
        relations: ['institution'],
      });

      if (parentAuth) {
        // Fetch linked student profile IDs
        const links = await this.parentStudentRepository.find({
          where: { parent: { id: parentAuth.id } },
          relations: ['studentProfile'],
        });
        linkedStudentIds = links.map((link) => link.studentProfile.id);
      }
    } else if (username && !institutionPrefix) {
      // Legacy flow: parse username like "inst_username"
      const underscoreIndex = username.indexOf('_');

      if (underscoreIndex > 0 && underscoreIndex < username.length - 1) {
        const parsedPrefix = username.slice(0, underscoreIndex);
        const localUsername = username.slice(underscoreIndex + 1);

        // First try new model (AuthEntity with PARENT role)
        parentAuth = await this.authRepository.findOne({
          where: {
            username: localUsername,
            role: UserRoles.PARENT,
            institution: { prefix: parsedPrefix },
          },
          relations: ['institution'],
        });

        if (parentAuth) {
          // Fetch linked student profile IDs
          const links = await this.parentStudentRepository.find({
            where: { parent: { id: parentAuth.id } },
            relations: ['studentProfile'],
          });
          linkedStudentIds = links.map((link) => link.studentProfile.id);
        }
      }
    }

    if (!parentAuth || !parentAuth.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (parentAuth.password !== hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: UserData = {
      authId: parentAuth.id,
      username: parentAuth.email || parentAuth.username,
      role: UserRoles.PARENT,
      institutionId: parentAuth?.institution?.prefix,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: parentAuth.id,
        username: parentAuth.username,
        name: parentAuth.name,
        role: UserRoles.PARENT,
        institutionId: parentAuth.institution?.prefix,
        linkedStudentIds: linkedStudentIds,
        isActive: parentAuth.isActive,
        createdAt: parentAuth.createdAt,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    // Verify OTP
    const otpRecord = await this.verifyOtp(email, otp, OtpTypes.PASSWORD_RESET);

    // Find user
    const user = await this.authRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash new password
    const hashedPassword = hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await this.authRepository.save(user);

    // Mark OTP as verified
    otpRecord.status = OtpStatuses.VERIFIED;
    await this.otpRepository.save(otpRecord);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async sendOtp(sendOtpDto: { email: string; type?: OtpTypesType }) {
    const { email, type = OtpTypes.SIGNUP } = sendOtpDto;

    // Check if email already exists in auth entity
    const existingUser = await this.authRepository.findOne({
      where: { email: email },
    });

    // For SIGNUP type, email should not exist
    if (type === OtpTypes.SIGNUP && existingUser) {
      throw new ConflictException('Email already used with another account');
    }

    // For PASSWORD_RESET type, email must exist
    if (type === OtpTypes.PASSWORD_RESET && !existingUser) {
      throw new BadRequestException('No account found with this email');
    }

    // For EMAIL_VERIFICATION type, no restriction on email existence

    const name = email.split('@')[0];

    // Generate OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const otpRecord = this.otpRepository.create({
      email,
      otp,
      type,
      status: OtpStatuses.PENDING,
      expiresAt,
    });

    await this.otpRepository.save(otpRecord);

    // Get email template and subject based on type
    const htmlContent =
      type === OtpTypes.PASSWORD_RESET
        ? this.getResetPasswordEmailTemplate(name, otp)
        : this.getEmailTemplate(name, otp);

    const subject =
      type === OtpTypes.PASSWORD_RESET
        ? 'Reset Your Password - Edunexs'
        : 'Verify Your Email - Edunexs';

    // Send email via Brevo
    try {
      await this.brevoService.sendEmail({
        to: [{ email, name }],
        subject,
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

  async uploadFile(
    authId: number,
    file: Express.Multer.File,
    uploadDto: UploadFileDto,
  ) {
    const user = await this.authRepository.findOne({
      where: { id: authId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      const fileName = uploadDto?.fileName || file.originalname;

      const uploadResult = await this.appwriteStorageService.uploadFile({
        file: file.buffer,
        fileName: fileName,
        mimeType: file.mimetype,
      });

      // Save file record in database
      const fileRecord = this.fileRepository.create({
        fileName: uploadResult.fileName,
        fileId: uploadResult.fileId,
        mimeType: uploadResult.mimeType,
        sizeOriginal: uploadResult.sizeOriginal,
      });

      const savedFile = await this.fileRepository.save(fileRecord);

      this.logger.log(`File uploaded successfully for user ${authId}`);

      // Generate public URL on response
      const publicUrl = this.appwriteStorageService.getFileViewUrl({
        fileId: uploadResult.fileId,
      });

      return {
        success: true,
        message: 'File uploaded successfully',
        dbFileId: savedFile.id,
        appwriteFileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        sizeOriginal: uploadResult.sizeOriginal,
        publicUrl: publicUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file for user ${authId}`,
        error instanceof Error ? error.message : '',
      );
      throw new InternalServerErrorException('Failed to upload file');
    }
  }
}
