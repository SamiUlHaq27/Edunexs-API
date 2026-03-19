import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthEntity, FileEntity } from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos';
import { hashPassword } from 'src/shared/helpers';
import { InstitutionContextService } from 'src/shared/services';
import { UserData } from 'src/shared/types';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CreateTeacherDto, DeleteTeacherDto, UpdateTeacherDto } from '../dtos';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async createTeacher(createTeacherDto: CreateTeacherDto, user: UserData) {
    const { name, password, profilePictureFileId, recoveryEmail } =
      createTeacherDto;
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    await this.ensureProfilePictureExists(profilePictureFileId);
    await this.ensureUniqueEmail(recoveryEmail);

    const username = await this.generateUniqueUsername(
      managerInstitution.prefix,
      name,
    );

    const newTeacher = this.authRepository.create({
      username,
      password: hashPassword(password),
      name,
      role: UserRoles.TEACHER,
      isActive: true,
      ...(recoveryEmail && { email: recoveryEmail }),
      profilePictureFile: { id: profilePictureFileId } as FileEntity,
    });

    try {
      const savedTeacher = await this.authRepository.save(newTeacher);

      return {
        id: savedTeacher.id,
        username: savedTeacher.username,
        name: savedTeacher.name,
        role: savedTeacher.role,
        isActive: savedTeacher.isActive,
        recoveryEmail: savedTeacher.email,
        profilePictureFileId: savedTeacher.profilePictureFile?.id,
        institutionPrefix: managerInstitution.prefix,
        createdAt: savedTeacher.createdAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create teacher');
    }
  }

  async listTeachers(listFiltersDto: ListFiltersDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const where: FindOptionsWhere<AuthEntity> = {
      role: UserRoles.TEACHER,
      username: Like(`${managerInstitution.prefix}_%`),
    };

    if (filters && typeof filters === 'object') {
      const typedFilters = filters as Record<string, unknown>;

      if (typeof typedFilters.name === 'string') {
        where.name = Like(`%${typedFilters.name}%`);
      }

      if (typeof typedFilters.email === 'string') {
        where.email = Like(`%${typedFilters.email}%`);
      }

      if (typeof typedFilters.username === 'string') {
        where.username = Like(`%${typedFilters.username}%`);
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

    const [data, total] = await this.authRepository.findAndCount({
      where,
      relations: ['profilePictureFile'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    const teachers = data.map((teacher) => ({
      id: teacher.id,
      username: teacher.username,
      name: teacher.name,
      role: teacher.role,
      isActive: teacher.isActive,
      recoveryEmail: teacher.email,
      profilePictureFileId: teacher.profilePictureFile?.id,
      institutionPrefix: managerInstitution.prefix,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    }));

    return {
      data: teachers,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async updateTeacher(updateTeacherDto: UpdateTeacherDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const {
      teacherId,
      name,
      password,
      profilePictureFileId,
      recoveryEmail,
      isActive,
    } = updateTeacherDto;

    const teacher = await this.authRepository.findOne({
      where: { id: teacherId, role: UserRoles.TEACHER },
      relations: ['profilePictureFile'],
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!teacher.username?.startsWith(`${managerInstitution.prefix}_`)) {
      throw new NotFoundException(
        'Teacher does not belong to your institution',
      );
    }

    if (recoveryEmail !== undefined && recoveryEmail !== teacher.email) {
      await this.ensureUniqueEmail(recoveryEmail, teacher.id);
      teacher.email = recoveryEmail;
    }

    if (profilePictureFileId !== undefined) {
      await this.ensureProfilePictureExists(profilePictureFileId);
      teacher.profilePictureFile = { id: profilePictureFileId } as FileEntity;
    }

    if (name !== undefined) teacher.name = name;
    if (isActive !== undefined) teacher.isActive = isActive;
    if (password) {
      teacher.password = hashPassword(password);
    }

    try {
      const updatedTeacher = await this.authRepository.save(teacher);

      return {
        id: updatedTeacher.id,
        username: updatedTeacher.username,
        name: updatedTeacher.name,
        role: updatedTeacher.role,
        isActive: updatedTeacher.isActive,
        recoveryEmail: updatedTeacher.email,
        profilePictureFileId: updatedTeacher.profilePictureFile?.id,
        institutionPrefix: managerInstitution.prefix,
        updatedAt: updatedTeacher.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update teacher');
    }
  }

  async deleteTeacher(deleteTeacherDto: DeleteTeacherDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const teacher = await this.authRepository.findOne({
      where: { id: deleteTeacherDto.teacherId, role: UserRoles.TEACHER },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!teacher.username?.startsWith(`${managerInstitution.prefix}_`)) {
      throw new NotFoundException(
        'Teacher does not belong to your institution',
      );
    }

    try {
      await this.authRepository.softDelete(teacher.id);

      return {
        success: true,
        message: 'Teacher deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete teacher');
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
