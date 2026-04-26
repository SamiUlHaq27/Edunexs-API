import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthEntity,
  FileEntity,
  InstitutionEntity,
  OtpEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { OtpStatuses, OtpTypes, UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { hashPassword } from 'src/shared/helpers';
import {
  AppwriteStorageService,
  InstitutionContextService,
} from 'src/shared/services';
import { UserData } from 'src/shared/types';
import { Repository } from 'typeorm';
import { CreateStudentDto } from '../dtos/create-student.dto';
import { DeleteStudentDto } from '../dtos/delete-student.dto';
import { UpdateStudentDto } from '../dtos/update-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
    private readonly institutionContextService: InstitutionContextService,
    private readonly appwriteStorageService: AppwriteStorageService,
  ) {}

  async createStudent(
    createStudentDto: CreateStudentDto,
    user: UserData,
    profilePicture?: Express.Multer.File,
  ) {
    const { name, password, rollNo, grade, recoveryEmail, otp } =
      createStudentDto;
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    // If recovery email is provided, verify OTP.
    if (recoveryEmail && otp) {
      const otpRecord = await this.otpRepository.findOne({
        where: {
          email: recoveryEmail,
          otp,
          type: OtpTypes.EMAIL_VERIFICATION,
          status: OtpStatuses.PENDING,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otpRecord) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      if (otpRecord?.expiresAt && new Date() > otpRecord.expiresAt) {
        otpRecord.status = OtpStatuses.EXPIRED;
        await this.otpRepository.save(otpRecord);
        throw new BadRequestException('OTP has expired');
      }

      otpRecord.status = OtpStatuses.VERIFIED;
      await this.otpRepository.save(otpRecord);
    } else if (recoveryEmail && !otp) {
      throw new BadRequestException(
        'OTP is required when recovery email is provided',
      );
    }

    await this.ensureUniqueEmail(recoveryEmail);

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

    const normalizedRollNo = rollNo.trim();

    const existingStudentProfile = await this.studentProfileRepository.findOne({
      where: {
        rollNo: normalizedRollNo,
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['institution'],
    });

    if (existingStudentProfile) {
      throw new ConflictException(
        'Student with this roll number already exists in your institution',
      );
    }

    try {
      const result = await this.authRepository.manager.transaction(
        async (manager) => {
          const studentAuthRepository = manager.getRepository(AuthEntity);
          const studentProfileRepository =
            manager.getRepository(StudentProfileEntity);

          const newStudent = studentAuthRepository.create({
            username: normalizedRollNo,
            institution: { prefix: managerInstitution.prefix },
            password: hashPassword(password),
            name,
            role: UserRoles.STUDENT,
            isActive: true,
            ...(recoveryEmail && { email: recoveryEmail }),
            ...(uploadedProfileFile && {
              profilePictureFile: {
                id: uploadedProfileFile.id,
              } as FileEntity,
            }),
          });

          const savedStudent = await studentAuthRepository.save(newStudent);

          const profile = studentProfileRepository.create({
            rollNo: normalizedRollNo,
            grade: grade.trim(),
            student: { id: savedStudent.id } as AuthEntity,
            institution: {
              prefix: managerInstitution.prefix,
            } as InstitutionEntity,
          });

          const savedProfile = await studentProfileRepository.save(profile);

          return { savedStudent, savedProfile };
        },
      );

      return {
        id: result.savedStudent.id,
        studentProfileId: result.savedProfile.id,
        username: result.savedStudent.username,
        name: result.savedStudent.name,
        role: result.savedStudent.role,
        isActive: result.savedStudent.isActive,
        recoveryEmail: result.savedStudent.email,
        profilePictureFileId: result.savedStudent.profilePictureFile?.id,
        profilePicture: this.buildProfilePictureResponse(
          result.savedStudent.profilePictureFile,
        ),
        rollNo: result.savedProfile.rollNo,
        grade: result.savedProfile.grade,
        institutionPrefix: managerInstitution.prefix,
        createdAt: result.savedStudent.createdAt,
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

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create student');
    }
  }

  async listStudents(listFiltersDto: ListFiltersDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const queryBuilder = this.studentProfileRepository
      .createQueryBuilder('studentProfile')
      .leftJoinAndSelect('studentProfile.student', 'student')
      .leftJoinAndSelect('student.profilePictureFile', 'profilePictureFile')
      .where('studentProfile.institutionPrefix = :institutionPrefix', {
        institutionPrefix: managerInstitution.prefix,
      })
      .andWhere('student.role = :role', { role: UserRoles.STUDENT });

    if (filters && typeof filters === 'object') {
      const typedFilters = filters as Record<string, unknown>;

      if (typeof typedFilters.name === 'string') {
        queryBuilder.andWhere('student.name ILIKE :name', {
          name: `%${typedFilters.name}%`,
        });
      }

      if (typeof typedFilters.email === 'string') {
        queryBuilder.andWhere('student.email ILIKE :email', {
          email: `%${typedFilters.email}%`,
        });
      }

      if (typeof typedFilters.username === 'string') {
        queryBuilder.andWhere('student.username ILIKE :username', {
          username: `%${typedFilters.username}%`,
        });
      }

      if (typeof typedFilters.rollNo === 'string') {
        queryBuilder.andWhere('studentProfile.rollNo ILIKE :rollNo', {
          rollNo: `%${typedFilters.rollNo}%`,
        });
      }

      if (typeof typedFilters.grade === 'string') {
        queryBuilder.andWhere('studentProfile.grade ILIKE :grade', {
          grade: `%${typedFilters.grade}%`,
        });
      }

      if (typedFilters.isActive !== undefined) {
        const isActiveValue = typedFilters.isActive;
        if (typeof isActiveValue === 'string') {
          queryBuilder.andWhere('student.isActive = :isActive', {
            isActive: isActiveValue === 'true',
          });
        } else if (typeof isActiveValue === 'boolean') {
          queryBuilder.andWhere('student.isActive = :isActive', {
            isActive: isActiveValue,
          });
        }
      }
    }

    const [data, total] = await queryBuilder
      .orderBy('student.createdAt', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    const students = data.map((studentProfile) => ({
      id: studentProfile.student.id,
      studentProfileId: studentProfile.id,
      username: studentProfile.student.username,
      name: studentProfile.student.name,
      role: studentProfile.student.role,
      isActive: studentProfile.student.isActive,
      recoveryEmail: studentProfile.student.email,
      profilePictureFileId: studentProfile.student.profilePictureFile?.id,
      profilePicture: this.buildProfilePictureResponse(
        studentProfile.student.profilePictureFile,
      ),
      rollNo: studentProfile.rollNo,
      grade: studentProfile.grade,
      institutionPrefix: managerInstitution.prefix,
      createdAt: studentProfile.student.createdAt,
      updatedAt: studentProfile.student.updatedAt,
    }));

    return {
      data: students,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async updateStudent(
    updateStudentDto: UpdateStudentDto,
    user: UserData,
    profilePicture?: Express.Multer.File,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const {
      studentId,
      name,
      password,
      rollNo,
      grade,
      recoveryEmail,
      isActive,
    } = updateStudentDto;

    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        student: { id: studentId },
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['student', 'student.profilePictureFile', 'institution'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found');
    }

    if (
      recoveryEmail !== undefined &&
      recoveryEmail !== studentProfile.student.email
    ) {
      await this.ensureUniqueEmail(recoveryEmail, studentProfile.student.id);
      studentProfile.student.email = recoveryEmail;
    }

    if (rollNo !== undefined && rollNo.trim() !== studentProfile.rollNo) {
      const normalizedRollNo = rollNo.trim();
      const existingStudentProfile =
        await this.studentProfileRepository.findOne({
          where: {
            rollNo: normalizedRollNo,
            institution: { prefix: managerInstitution.prefix },
          },
          relations: ['institution'],
        });

      if (
        existingStudentProfile &&
        existingStudentProfile.id !== studentProfile.id
      ) {
        throw new ConflictException(
          'Student with this roll number already exists in your institution',
        );
      }

      studentProfile.rollNo = normalizedRollNo;
      studentProfile.student.username = normalizedRollNo;
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
        studentProfile.student.profilePictureFile = {
          id: savedFile.id,
        } as FileEntity;
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to upload profile picture: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    if (name !== undefined) studentProfile.student.name = name;
    if (isActive !== undefined) studentProfile.student.isActive = isActive;
    if (password) {
      studentProfile.student.password = hashPassword(password);
    }
    if (grade !== undefined) studentProfile.grade = grade.trim();

    try {
      const result = await this.authRepository.manager.transaction(
        async (manager) => {
          const studentAuthRepository = manager.getRepository(AuthEntity);
          const studentProfileRepository =
            manager.getRepository(StudentProfileEntity);

          const updatedStudent = await studentAuthRepository.save(
            studentProfile.student,
          );
          const updatedProfile =
            await studentProfileRepository.save(studentProfile);

          return { updatedStudent, updatedProfile };
        },
      );

      return {
        id: result.updatedStudent.id,
        studentProfileId: result.updatedProfile.id,
        username: result.updatedStudent.username,
        name: result.updatedStudent.name,
        role: result.updatedStudent.role,
        isActive: result.updatedStudent.isActive,
        recoveryEmail: result.updatedStudent.email,
        profilePictureFileId: result.updatedStudent.profilePictureFile?.id,
        profilePicture: this.buildProfilePictureResponse(
          result.updatedStudent.profilePictureFile,
        ),
        rollNo: result.updatedProfile.rollNo,
        grade: result.updatedProfile.grade,
        institutionPrefix: managerInstitution.prefix,
        updatedAt: result.updatedStudent.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update student');
    }
  }

  async deleteStudent(deleteStudentDto: DeleteStudentDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        student: { id: deleteStudentDto.studentId },
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['student', 'institution'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found');
    }

    try {
      await this.authRepository.manager.transaction(async (manager) => {
        const studentAuthRepository = manager.getRepository(AuthEntity);
        const studentProfileRepository =
          manager.getRepository(StudentProfileEntity);

        await studentAuthRepository.softDelete(studentProfile.student.id);
        await studentProfileRepository.softDelete(studentProfile.id);
      });

      return {
        success: true,
        message: 'Student deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete student');
    }
  }

  private async ensureUniqueEmail(email?: string, currentAuthId?: number) {
    if (!email) {
      return;
    }

    const existingAuth = await this.authRepository.findOne({
      where: { email },
    });

    if (existingAuth && existingAuth.id !== currentAuthId) {
      throw new ConflictException('Email already exists');
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
}
