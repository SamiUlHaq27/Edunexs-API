import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import {
  AuthEntity,
  FileEntity,
  InstitutionEntity,
  OtpEntity,
  ParentLoginEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import {
  CreateInstitutionAdminDto,
  UpdateInstitutionAdminDto,
  UpdateInstitutionAdminProfileDto,
} from '../dtos';
import { OtpStatuses, OtpTypes, UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { hashPassword } from 'src/shared/helpers';
import { AppwriteStorageService } from 'src/shared/services/appwrite-storage.service';

type OwnerContextUser = {
  authId: number;
  role: string;
  institutionId?: string | null;
};

@Injectable()
export class InstitutionAdminService {
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
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    private readonly appwriteStorageService: AppwriteStorageService,
  ) {}

  async create(
    createInstitutionAdminDto: CreateInstitutionAdminDto,
    user: OwnerContextUser,
    profilePicture?: Express.Multer.File,
  ) {
    const { username, password, name, email, otp } = createInstitutionAdminDto;

    // Verify the owner has an institution
    const institution = await this.getOwnerInstitution(
      user,
      'You must have an institution to create institution admins',
    );

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to create institution admins',
      );
    }

    // If email is provided, verify OTP
    if (email && otp) {
      const otpRecord = await this.otpRepository.findOne({
        where: {
          email,
          otp,
          type: OtpTypes.EMAIL_VERIFICATION,
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

      // Mark OTP as verified
      otpRecord.status = OtpStatuses.VERIFIED;
      await this.otpRepository.save(otpRecord);
    } else if (email && !otp) {
      throw new BadRequestException('OTP is required when email is provided');
    }

    // If email is provided, check if it already exists first
    if (email) {
      const existingEmail = await this.authRepository.findOne({
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check if username already exists for this institution using composite key
    const existingUser = await this.authRepository.findOne({
      where: {
        username: username,
        institution: { prefix: institution.prefix },
      },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    let uploadedProfileFile: FileEntity | undefined;
    if (profilePicture) {
      const maxFileSize = 5 * 1024 * 1024;
      if (profilePicture.size > maxFileSize) {
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      try {
        const uploadResult = await this.appwriteStorageService.uploadFile({
          file: profilePicture.buffer,
          fileName: profilePicture.originalname,
          mimeType: profilePicture.mimetype,
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

    // Create new institution admin user
    const newInstitutionAdmin = this.authRepository.create({
      username: username,
      institution: { prefix: institution.prefix },
      ...(email && { email }),
      password: hashedPassword,
      name,
      role: UserRoles.INSTITUTION_ADMIN,
      isActive: true,
      ...(uploadedProfileFile && {
        profilePictureFile: { id: uploadedProfileFile.id },
      }),
    });

    try {
      const savedInstitutionAdmin =
        await this.authRepository.save(newInstitutionAdmin);

      return {
        id: savedInstitutionAdmin?.id,
        email: savedInstitutionAdmin?.email,
        username: savedInstitutionAdmin?.username,
        name: savedInstitutionAdmin?.name,
        role: savedInstitutionAdmin?.role,
        isActive: savedInstitutionAdmin?.isActive,
        createdAt: savedInstitutionAdmin?.createdAt,
      };
    } catch {
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

      throw new InternalServerErrorException(
        'Failed to create institution admin',
      );
    }
  }

  async update(
    institutionAdminId: number,
    updateInstitutionAdminDto: UpdateInstitutionAdminDto,
    user: OwnerContextUser,
    profilePicture?: Express.Multer.File,
  ) {
    const { password, name, email, otp, isActive } = updateInstitutionAdminDto;

    // Verify the owner has an institution
    const institution = await this.getOwnerInstitution(
      user,
      'You must have an institution to update institution admins',
    );

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to update institution admins',
      );
    }

    // Find the institution admin
    const institutionAdmin = await this.authRepository.findOne({
      where: {
        id: institutionAdminId,
        role: UserRoles.INSTITUTION_ADMIN,
        institution: { prefix: institution?.prefix },
      },
    });

    if (!institutionAdmin) {
      throw new NotFoundException('Institution admin not found');
    }

    // If email is being changed or added, verify OTP
    if (email && email !== institutionAdmin.email) {
      if (!otp) {
        throw new BadRequestException(
          'OTP is required when changing or adding email',
        );
      }

      const otpRecord = await this.otpRepository.findOne({
        where: {
          email,
          otp,
          type: OtpTypes.EMAIL_VERIFICATION,
          status: OtpStatuses.PENDING,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otpRecord) {
        // Check if OTP exists with different status
        const otpWithDifferentStatus = await this.otpRepository.findOne({
          where: {
            email,
            otp,
            type: OtpTypes.EMAIL_VERIFICATION,
          },
          order: { createdAt: 'DESC' },
        });

        if (otpWithDifferentStatus) {
          if (otpWithDifferentStatus.status === OtpStatuses.VERIFIED) {
            throw new BadRequestException('OTP has already been used');
          } else if (otpWithDifferentStatus.status === OtpStatuses.EXPIRED) {
            throw new BadRequestException('OTP has expired');
          }
        }

        throw new BadRequestException('Invalid or expired OTP');
      }

      // Check if OTP has expired
      if (otpRecord?.expiresAt && new Date() > otpRecord.expiresAt) {
        otpRecord.status = OtpStatuses.EXPIRED;
        await this.otpRepository.save(otpRecord);
        throw new BadRequestException('OTP has expired');
      }

      // Check if email already exists
      const existingEmail = await this.authRepository.findOne({
        where: { email },
      });

      if (existingEmail && existingEmail.id !== institutionAdminId) {
        throw new ConflictException('Email already exists');
      }

      // Mark OTP as verified
      otpRecord.status = OtpStatuses.VERIFIED;
      await this.otpRepository.save(otpRecord);
    }

    // Update fields
    if (name !== undefined) institutionAdmin.name = name;
    if (email !== undefined) institutionAdmin.email = email;
    if (isActive !== undefined) institutionAdmin.isActive = isActive;
    if (password) {
      institutionAdmin.password = hashPassword(password);
    }
    if (profilePicture) {
      const maxFileSize = 5 * 1024 * 1024;
      if (profilePicture.size > maxFileSize) {
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      try {
        const uploadResult = await this.appwriteStorageService.uploadFile({
          file: profilePicture.buffer,
          fileName: profilePicture.originalname,
          mimeType: profilePicture.mimetype,
        });

        const fileRecord = this.fileRepository.create({
          fileName: uploadResult.fileName,
          fileId: uploadResult.fileId,
          mimeType: uploadResult.mimeType,
          sizeOriginal: uploadResult.sizeOriginal,
        });

        const savedFile = await this.fileRepository.save(fileRecord);
        institutionAdmin.profilePictureFile = {
          id: savedFile.id,
        } as FileEntity;
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to upload profile picture: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    try {
      const updatedInstitutionAdmin =
        await this.authRepository.save(institutionAdmin);

      return {
        id: updatedInstitutionAdmin?.id,
        email: updatedInstitutionAdmin?.email,
        username: updatedInstitutionAdmin?.username,
        name: updatedInstitutionAdmin?.name,
        role: updatedInstitutionAdmin?.role,
        isActive: updatedInstitutionAdmin?.isActive,
        updatedAt: updatedInstitutionAdmin?.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to update institution admin',
      );
    }
  }

  async updateProfile(
    institutionAdminId: number,
    updateInstitutionAdminProfileDto: UpdateInstitutionAdminProfileDto,
    profilePicture?: Express.Multer.File,
  ) {
    const { password, email, otp } = updateInstitutionAdminProfileDto;

    // Find the institution admin
    const institutionAdmin = await this.authRepository.findOne({
      where: {
        id: institutionAdminId,
        role: UserRoles.INSTITUTION_ADMIN,
      },
    });

    if (!institutionAdmin) {
      throw new NotFoundException('Institution admin not found');
    }

    // If email is being changed or added, verify OTP
    if (email && email !== institutionAdmin.email) {
      if (!otp) {
        throw new BadRequestException(
          'OTP is required when changing or adding email',
        );
      }

      const otpRecord = await this.otpRepository.findOne({
        where: {
          email,
          otp,
          type: OtpTypes.SIGNUP,
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

      // Check if email already exists
      const existingEmail = await this.authRepository.findOne({
        where: { email },
      });

      if (existingEmail && existingEmail.id !== institutionAdminId) {
        throw new ConflictException('Email already exists');
      }

      // Mark OTP as verified
      otpRecord.status = OtpStatuses.VERIFIED;
      await this.otpRepository.save(otpRecord);
    }

    // Update fields
    if (email !== undefined) institutionAdmin.email = email;
    if (password) {
      institutionAdmin.password = hashPassword(password);
    }
    if (profilePicture) {
      const maxFileSize = 5 * 1024 * 1024;
      if (profilePicture.size > maxFileSize) {
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      try {
        const uploadResult = await this.appwriteStorageService.uploadFile({
          file: profilePicture.buffer,
          fileName: profilePicture.originalname,
          mimeType: profilePicture.mimetype,
        });

        const fileRecord = this.fileRepository.create({
          fileName: uploadResult.fileName,
          fileId: uploadResult.fileId,
          mimeType: uploadResult.mimeType,
          sizeOriginal: uploadResult.sizeOriginal,
        });

        const savedFile = await this.fileRepository.save(fileRecord);
        institutionAdmin.profilePictureFile = {
          id: savedFile.id,
        } as FileEntity;
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to upload profile picture: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    try {
      const updatedInstitutionAdmin =
        await this.authRepository.save(institutionAdmin);

      return {
        id: updatedInstitutionAdmin?.id,
        email: updatedInstitutionAdmin?.email,
        username: updatedInstitutionAdmin?.username,
        name: updatedInstitutionAdmin?.name,
        role: updatedInstitutionAdmin?.role,
        isActive: updatedInstitutionAdmin?.isActive,
        updatedAt: updatedInstitutionAdmin?.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async findAll(user: OwnerContextUser, listFiltersDto: ListFiltersDto) {
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution');

    // Build where clause
    const where: FindOptionsWhere<AuthEntity> = {
      role: UserRoles.INSTITUTION_ADMIN,
    };

    if (filters && typeof filters === 'object') {
      const typedFilters = filters as Record<string, unknown>;

      if (typeof typedFilters.name === 'string') {
        where.name = Like(`%${typedFilters.name}%`);
      }

      if (typeof typedFilters.email === 'string') {
        where.email = Like(`%${typedFilters.email}%`);
      }

      if (typedFilters.isActive !== undefined) {
        const isActiveValue = typedFilters.isActive;
        if (typeof isActiveValue === 'string') {
          where.isActive = isActiveValue === 'true';
        } else if (typeof isActiveValue === 'boolean') {
          where.isActive = isActiveValue;
        }
      }
    }

    // Find all institution admins whose username starts with institution prefix
    const [data, total] = await this.authRepository.findAndCount({
      where: [
        {
          ...where,
          institution: { prefix: user?.institutionId },
        },
      ],
      relations: ['profilePictureFile'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    const institutionAdmins = data.map((institutionAdmin) => {
      const profilePicture = this.buildProfilePictureResponse(
        institutionAdmin.profilePictureFile,
      );

      return {
        id: institutionAdmin.id,
        email: institutionAdmin.email,
        username: institutionAdmin.username,
        name: institutionAdmin.name,
        role: institutionAdmin.role,
        isActive: institutionAdmin.isActive,
        createdAt: institutionAdmin.createdAt,
        updatedAt: institutionAdmin.updatedAt,
        profilePictureFileId: institutionAdmin.profilePictureFile?.id,
        profilePicture,
      };
    });

    return {
      data: institutionAdmins,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async delete(institutionAdminId: number, user: OwnerContextUser) {
    // Verify the owner has an institution
    const institution = await this.getOwnerInstitution(
      user,
      'You must have an institution to delete institution admins',
    );

    if (!institution) {
      throw new NotFoundException(
        'You must have an institution to delete institution admins',
      );
    }

    // Find the institution admin
    const institutionAdmin = await this.authRepository.findOne({
      where: {
        id: institutionAdminId,
        role: UserRoles.INSTITUTION_ADMIN,
      },
    });

    if (!institutionAdmin) {
      throw new NotFoundException('Institution admin not found');
    }

    // Verify institution admin username starts with institution prefix (belongs to this institution)
    if (!institutionAdmin.username.startsWith(`${institution.prefix}_`)) {
      throw new NotFoundException(
        'Institution admin does not belong to your institution',
      );
    }

    try {
      await this.authRepository.softDelete(institutionAdminId);

      return {
        success: true,
        message: 'Institution admin deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to delete institution admin',
      );
    }
  }

  private buildProfilePictureResponse(fileEntity?: FileEntity | null) {
    if (!fileEntity) {
      return null;
    }

    const publicUrl = this.appwriteStorageService.getFileViewUrl({
      fileId: fileEntity.fileId,
    });

    return {
      id: fileEntity.id,
      fileId: fileEntity.fileId,
      publicUrl,
    };
  }

  private async getOwnerInstitution(
    user: OwnerContextUser,
    notFoundMessage: string,
  ) {
    const institutionId: string | null | undefined = user.institutionId;

    if (typeof institutionId === 'string' && institutionId.length > 0) {
      const where: FindOptionsWhere<InstitutionEntity> =
        user.role === UserRoles.INSTITUTION_OWNER
          ? {
              prefix: institutionId,
              owner: { id: user.authId },
            }
          : { prefix: institutionId };

      const institutionByToken = await this.institutionRepository.findOne({
        where,
        relations: ['owner'],
      });

      if (institutionByToken) {
        return institutionByToken;
      }
    }

    const institution = await this.institutionRepository.findOne({
      where: { owner: { id: user.authId } },
      relations: ['owner'],
    });

    if (!institution) {
      throw new NotFoundException(notFoundMessage);
    }

    return institution;
  }
}
