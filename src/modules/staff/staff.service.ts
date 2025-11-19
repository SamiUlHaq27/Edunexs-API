import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AuthEntity } from 'src/database/entities/auth.entity';
import { InstitutionEntity } from 'src/database/entities/institution.entity';
import {
  OtpEntity,
  OtpStatusEnum,
  OtpTypeEnum,
} from 'src/database/entities/otp.entity';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStaffProfileDto,
  DeleteStaffDto,
} from './dtos';
import { UserRoleEnum } from 'src/shared/enums';
import { createHash } from 'crypto';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
  ) {}

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  async create(createStaffDto: CreateStaffDto, ownerId: number) {
    const { username, password, name, profilePictureUrl, email, otp } =
      createStaffDto;

    // Verify the owner has an institution
    const institution = await this.institutionRepository.findOne({
      where: { owner: { id: ownerId } },
      relations: ['owner'],
    });

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to create staff members',
      );
    }

    // If email is provided, verify OTP
    if (email && otp) {
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

      // Mark OTP as verified
      otpRecord.status = OtpStatusEnum.VERIFIED;
      await this.otpRepository.save(otpRecord);
    } else if (email && !otp) {
      throw new BadRequestException('OTP is required when email is provided');
    }

    // Add institution prefix to username
    const fullUsername = `${institution.prefix}_${username}`;

    // Check if username already exists
    const existingUser = await this.authRepository.findOne({
      where: { username: fullUsername },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // If email is provided, check if it already exists
    if (email) {
      const existingEmail = await this.authRepository.findOne({
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = this.hashPassword(password);

    // Create new staff user
    const newStaff = this.authRepository.create({
      username: fullUsername,
      ...(email && { email }),
      password: hashedPassword,
      name,
      profilePictureUrl,
      role: UserRoleEnum.STAFF,
      isActive: true,
    });

    try {
      const savedStaff = await this.authRepository.save(newStaff);

      return {
        id: savedStaff?.id,
        email: savedStaff?.email,
        username: savedStaff?.username,
        name: savedStaff?.name,
        profilePictureUrl: savedStaff?.profilePictureUrl,
        role: savedStaff?.role,
        isActive: savedStaff?.isActive,
        createdAt: savedStaff?.createdAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create staff member');
    }
  }

  async update(
    staffId: number,
    updateStaffDto: UpdateStaffDto,
    ownerId: number,
  ) {
    const { password, name, profilePictureUrl, email, otp, isActive } =
      updateStaffDto;

    // Verify the owner has an institution
    const institution = await this.institutionRepository.findOne({
      where: { owner: { id: ownerId } },
      relations: ['owner'],
    });

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to update staff members',
      );
    }

    // Find the staff member
    const staff = await this.authRepository.findOne({
      where: { id: staffId, role: UserRoleEnum.STAFF },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Verify staff username starts with institution prefix (belongs to this institution)
    if (!staff.username.startsWith(`${institution.prefix}_`)) {
      throw new NotFoundException(
        'Staff member does not belong to your institution',
      );
    }

    // If email is being changed or added, verify OTP
    if (email && email !== staff.email) {
      if (!otp) {
        throw new BadRequestException(
          'OTP is required when changing or adding email',
        );
      }

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

      // Check if email already exists
      const existingEmail = await this.authRepository.findOne({
        where: { email },
      });

      if (existingEmail && existingEmail.id !== staffId) {
        throw new ConflictException('Email already exists');
      }

      // Mark OTP as verified
      otpRecord.status = OtpStatusEnum.VERIFIED;
      await this.otpRepository.save(otpRecord);
    }

    // Update fields
    if (name !== undefined) staff.name = name;
    if (profilePictureUrl !== undefined)
      staff.profilePictureUrl = profilePictureUrl;
    if (email !== undefined) staff.email = email;
    if (isActive !== undefined) staff.isActive = isActive;
    if (password) {
      staff.password = this.hashPassword(password);
    }

    try {
      const updatedStaff = await this.authRepository.save(staff);

      return {
        id: updatedStaff?.id,
        email: updatedStaff?.email,
        username: updatedStaff?.username,
        name: updatedStaff?.name,
        profilePictureUrl: updatedStaff?.profilePictureUrl,
        role: updatedStaff?.role,
        isActive: updatedStaff?.isActive,
        updatedAt: updatedStaff?.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update staff member');
    }
  }

  async updateProfile(
    staffId: number,
    updateStaffProfileDto: UpdateStaffProfileDto,
  ) {
    const { password, profilePictureUrl, email, otp } = updateStaffProfileDto;

    // Find the staff member
    const staff = await this.authRepository.findOne({
      where: { id: staffId, role: UserRoleEnum.STAFF },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // If email is being changed or added, verify OTP
    if (email && email !== staff.email) {
      if (!otp) {
        throw new BadRequestException(
          'OTP is required when changing or adding email',
        );
      }

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

      // Check if email already exists
      const existingEmail = await this.authRepository.findOne({
        where: { email },
      });

      if (existingEmail && existingEmail.id !== staffId) {
        throw new ConflictException('Email already exists');
      }

      // Mark OTP as verified
      otpRecord.status = OtpStatusEnum.VERIFIED;
      await this.otpRepository.save(otpRecord);
    }

    // Update fields
    if (profilePictureUrl !== undefined)
      staff.profilePictureUrl = profilePictureUrl;
    if (email !== undefined) staff.email = email;
    if (password) {
      staff.password = this.hashPassword(password);
    }

    try {
      const updatedStaff = await this.authRepository.save(staff);

      return {
        id: updatedStaff?.id,
        email: updatedStaff?.email,
        username: updatedStaff?.username,
        name: updatedStaff?.name,
        profilePictureUrl: updatedStaff?.profilePictureUrl,
        role: updatedStaff?.role,
        isActive: updatedStaff?.isActive,
        updatedAt: updatedStaff?.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async findAll(ownerId: number, listFiltersDto: ListFiltersDto) {
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    // Verify the owner has an institution
    const institution = await this.institutionRepository.findOne({
      where: { owner: { id: ownerId } },
      relations: ['owner'],
    });

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to view staff members',
      );
    }

    // Build where clause
    const where: any = {
      role: UserRoleEnum.STAFF,
    };

    // Define allowed staff attributes for filtering
    const allowedAttributes = ['name', 'email', 'isActive'];

    // Apply filters
    if (filters && Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (allowedAttributes.includes(key)) {
            if (key === 'isActive') {
              where[key] = value === 'true' || value === true;
            } else {
              where[key] = Like(`%${value}%`);
            }
          }
        }
      }
    }

    // Find all staff members whose username starts with institution prefix
    const [data, total] = await this.authRepository.findAndCount({
      where: [
        {
          ...where,
          username: Like(`${institution.prefix}_%`),
        },
      ],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    const staffMembers = data.map((staff) => ({
      id: staff.id,
      email: staff.email,
      username: staff.username,
      name: staff.name,
      profilePictureUrl: staff.profilePictureUrl,
      role: staff.role,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    }));

    return {
      data: staffMembers,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async delete(staffId: number, ownerId: number) {
    // Verify the owner has an institution
    const institution = await this.institutionRepository.findOne({
      where: { owner: { id: ownerId } },
      relations: ['owner'],
    });

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to delete staff members',
      );
    }

    // Find the staff member
    const staff = await this.authRepository.findOne({
      where: { id: staffId, role: UserRoleEnum.STAFF },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Verify staff username starts with institution prefix (belongs to this institution)
    if (!staff.username.startsWith(`${institution.prefix}_`)) {
      throw new NotFoundException(
        'Staff member does not belong to your institution',
      );
    }

    try {
      await this.authRepository.softDelete(staffId);

      return {
        success: true,
        message: 'Staff member deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete staff member');
    }
  }
}
