import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthEntity } from 'src/database/entities/auth.entity';
import { UserRoleEnum } from 'src/shared/enums';
import { SignupDto, LoginDto } from './dto';
import { createHash } from 'crypto';
import { UserData } from 'src/shared/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  async signup(signupDto: SignupDto) {
    const { email, password, name, profilePictureUrl } = signupDto;

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
          id: savedUser.id,
          username: savedUser.username,
          name: savedUser.name,
          profilePictureUrl: savedUser.profilePictureUrl,
          role: savedUser.role,
          isActive: savedUser.isActive,
          createdAt: savedUser.createdAt,
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
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const hashedPassword = this.hashPassword(password);
    if (user.password !== hashedPassword) {
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
        id: user.id,
        username: user.username,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }
}
