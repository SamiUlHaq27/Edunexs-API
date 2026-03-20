import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthEntity,
  ParentLoginEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { hashPassword } from 'src/shared/helpers';
import { CreateParentLoginDto, ResetParentPasswordDto } from '../dtos';
import { UserData } from 'src/shared/types';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(ParentLoginEntity)
    private readonly parentLoginRepository: Repository<ParentLoginEntity>,
  ) {}

  async createParentLogin(
    createParentLoginDto: CreateParentLoginDto,
    user: UserData,
  ) {
    const { studentId, password, isEnabled } = createParentLoginDto;

    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        student: { id: studentId },
        institution: { prefix: user?.institutionId },
      },
      relations: ['student', 'institution'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found in your institution');
    }

    const existingParentLogin = await this.parentLoginRepository.findOne({
      where: { student: { id: studentId } },
      relations: ['student'],
    });

    if (existingParentLogin) {
      throw new ConflictException(
        'Parent login already exists for this student',
      );
    }

    const parentLogin = this.parentLoginRepository.create({
      student: { id: studentProfile.student.id } as AuthEntity,
      studentProfile: { id: studentProfile.id } as StudentProfileEntity,
      password: hashPassword(password),
      isEnabled: isEnabled ?? true,
    });

    try {
      const savedParentLogin =
        await this.parentLoginRepository.save(parentLogin);

      return {
        id: savedParentLogin.id,
        studentId: studentProfile.student.id,
        studentProfileId: studentProfile.id,
        isEnabled: savedParentLogin.isEnabled,
        createdAt: savedParentLogin.createdAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create parent login');
    }
  }

  async resetParentPassword(
    resetParentPasswordDto: ResetParentPasswordDto,
    user: UserData,
  ) {
    const { studentId, newPassword } = resetParentPasswordDto;

    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        student: { id: studentId },
        institution: { prefix: user?.institutionId },
      },
      relations: ['student', 'institution'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found in your institution');
    }

    const parentLogin = await this.parentLoginRepository.findOne({
      where: { student: { id: studentId } },
      relations: ['student'],
    });

    if (!parentLogin) {
      throw new NotFoundException('Parent login not found for this student');
    }

    parentLogin.password = hashPassword(newPassword);

    try {
      const updatedParentLogin =
        await this.parentLoginRepository.save(parentLogin);

      return {
        success: true,
        message: 'Parent password reset successfully',
        studentId,
        updatedAt: updatedParentLogin.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to reset parent password');
    }
  }
}
