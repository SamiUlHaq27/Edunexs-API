import {
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
  StudentProfileEntity,
} from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { hashPassword } from 'src/shared/helpers';
import { UserData } from 'src/shared/types';
import { Repository } from 'typeorm';
import { CreateStudentDto } from './dtos/create-student.dto';
import { DeleteStudentDto } from './dtos/delete-student.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { InstitutionContextService } from './institution-context.service';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async createStudent(createStudentDto: CreateStudentDto, user: UserData) {
    const { name, password, rollNo, grade, recoveryEmail } = createStudentDto;
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    if (createStudentDto?.profilePictureFileId)
      await this.ensureProfilePictureExists(
        createStudentDto?.profilePictureFileId,
      );
    await this.ensureUniqueEmail(recoveryEmail);

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

    const username = await this.generateUniqueUsername(
      managerInstitution.prefix,
      name,
    );

    try {
      const result = await this.authRepository.manager.transaction(
        async (manager) => {
          const studentAuthRepository = manager.getRepository(AuthEntity);
          const studentProfileRepository =
            manager.getRepository(StudentProfileEntity);

          const newStudent = studentAuthRepository.create({
            username,
            password: hashPassword(password),
            name,
            role: UserRoles.STUDENT,
            isActive: true,
            ...(recoveryEmail && { email: recoveryEmail }),
            ...(createStudentDto?.profilePictureFileId && {
              profilePictureFile: {
                id: createStudentDto?.profilePictureFileId,
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
        username: result.savedStudent.username,
        name: result.savedStudent.name,
        role: result.savedStudent.role,
        isActive: result.savedStudent.isActive,
        recoveryEmail: result.savedStudent.email,
        profilePictureFileId: result.savedStudent.profilePictureFile?.id,
        rollNo: result.savedProfile.rollNo,
        grade: result.savedProfile.grade,
        institutionPrefix: managerInstitution.prefix,
        createdAt: result.savedStudent.createdAt,
      };
    } catch (error) {
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
      username: studentProfile.student.username,
      name: studentProfile.student.name,
      role: studentProfile.student.role,
      isActive: studentProfile.student.isActive,
      recoveryEmail: studentProfile.student.email,
      profilePictureFileId: studentProfile.student.profilePictureFile?.id,
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

  async updateStudent(updateStudentDto: UpdateStudentDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const {
      studentId,
      name,
      password,
      rollNo,
      grade,
      profilePictureFileId,
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
    }

    if (profilePictureFileId !== undefined) {
      await this.ensureProfilePictureExists(profilePictureFileId);
      studentProfile.student.profilePictureFile = {
        id: profilePictureFileId,
      } as FileEntity;
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
        username: result.updatedStudent.username,
        name: result.updatedStudent.name,
        role: result.updatedStudent.role,
        isActive: result.updatedStudent.isActive,
        recoveryEmail: result.updatedStudent.email,
        profilePictureFileId: result.updatedStudent.profilePictureFile?.id,
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

  private async ensureProfilePictureExists(profilePictureFileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: profilePictureFileId },
    });

    if (!file) {
      throw new NotFoundException('Profile picture file not found');
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

  private normalizeUsernameSeed(name: string) {
    const normalizedSeed = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');

    return normalizedSeed || 'user';
  }

  private async generateUniqueUsername(
    institutionPrefix: string,
    name: string,
  ) {
    const normalizedSeed = this.normalizeUsernameSeed(name);
    let counter = 0;

    while (counter < 1000) {
      const suffix = counter === 0 ? '' : `_${counter + 1}`;
      const usernameCandidate = `${institutionPrefix}_${normalizedSeed}${suffix}`;

      const existingUser = await this.authRepository.findOne({
        where: { username: usernameCandidate },
      });

      if (!existingUser) {
        return usernameCandidate;
      }

      counter += 1;
    }

    throw new ConflictException(
      'Unable to generate unique username for this user',
    );
  }
}
