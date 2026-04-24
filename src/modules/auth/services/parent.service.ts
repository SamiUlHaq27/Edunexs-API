import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  AuthEntity,
  ParentLoginEntity,
  ParentStudentEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { hashPassword } from 'src/shared/helpers';
import {
  CreateParentDto,
  CreateParentLoginDto,
  UpdateParentDto,
  AddStudentsDto,
  RemoveStudentsDto,
  ResetParentPasswordDto,
} from '../dtos';
import { UserData } from 'src/shared/types';
import { Repository, DataSource, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRoles } from 'src/shared/consts';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(ParentLoginEntity)
    private readonly parentLoginRepository: Repository<ParentLoginEntity>,
    @InjectRepository(ParentStudentEntity)
    private readonly parentStudentRepository: Repository<ParentStudentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new parent and link them to one or more students
   */
  async createParent(createParentDto: CreateParentDto, user: UserData) {
    const { name, username, password, studentProfileIds, isEnabled } =
      createParentDto;

    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    if (!studentProfileIds || studentProfileIds.length === 0) {
      throw new BadRequestException(
        'At least one student must be linked to the parent.',
      );
    }

    // Check if username already exists in institution
    const existingParent = await this.authRepository.findOne({
      where: {
        username,
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
    });

    if (existingParent) {
      throw new ConflictException(
        'Parent username already exists in this institution.',
      );
    }

    // Fetch all student profiles to validate they exist and belong to the same institution
    const studentProfiles = await this.studentProfileRepository.find({
      where: {
        id: In(studentProfileIds),
        institution: { prefix: user.institutionId },
      },
      relations: ['student', 'institution'],
    });

    if (studentProfiles.length !== studentProfileIds.length) {
      throw new BadRequestException(
        'One or more students not found in your institution.',
      );
    }

    // Check if any student is already linked to another parent
    const existingLinks = await this.parentStudentRepository.find({
      where: {
        studentProfile: { id: In(studentProfileIds) },
      },
    });

    if (existingLinks.length > 0) {
      throw new ConflictException(
        'One or more students are already linked to another parent.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create parent auth record
      const parentAuth = queryRunner.manager.create(AuthEntity, {
        username,
        password: hashPassword(password),
        name,
        role: UserRoles.PARENT,
        institution: { prefix: user.institutionId } as any,
        isActive: isEnabled ?? true,
      });

      const savedParent = await queryRunner.manager.save(parentAuth);

      // Create relation records
      const relations = studentProfiles.map((studentProfile) =>
        queryRunner.manager.create(ParentStudentEntity, {
          parent: { id: savedParent.id } as AuthEntity,
          studentProfile: { id: studentProfile.id } as StudentProfileEntity,
        }),
      );

      await queryRunner.manager.save(relations);
      await queryRunner.commitTransaction();

      return {
        id: savedParent.id,
        username: savedParent.username,
        name: savedParent.name,
        role: savedParent.role,
        isActive: savedParent.isActive,
        linkedStudentCount: studentProfiles.length,
        linkedStudentIds: studentProfiles.map((sp) => sp.id),
        createdAt: savedParent.createdAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create parent');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * List all parents in the institution
   */
  async listParents(user: UserData, page: number = 1, limit: number = 10) {
    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const skip = (page - 1) * limit;

    const [parents, total] = await this.authRepository.findAndCount({
      where: {
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // For each parent, count linked students
    const parentsWithCounts = await Promise.all(
      parents.map(async (parent) => {
        const linkedCount = await this.parentStudentRepository.count({
          where: { parent: { id: parent.id } },
        });

        return {
          id: parent.id,
          username: parent.username,
          name: parent.name,
          isActive: parent.isActive,
          linkedStudentCount: linkedCount,
          createdAt: parent.createdAt,
          updatedAt: parent.updatedAt,
        };
      }),
    );

    return {
      data: parentsWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update parent details (name, isActive)
   */
  async updateParent(
    parentId: number,
    updateParentDto: UpdateParentDto,
    user: UserData,
  ) {
    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const parent = await this.authRepository.findOne({
      where: {
        id: parentId,
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found in your institution.');
    }

    const { name, isEnabled } = updateParentDto;

    if (name) parent.name = name;
    if (isEnabled !== undefined) parent.isActive = isEnabled;

    try {
      const updatedParent = await this.authRepository.save(parent);

      const linkedCount = await this.parentStudentRepository.count({
        where: { parent: { id: updatedParent.id } },
      });

      return {
        id: updatedParent.id,
        username: updatedParent.username,
        name: updatedParent.name,
        isActive: updatedParent.isActive,
        linkedStudentCount: linkedCount,
        updatedAt: updatedParent.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update parent');
    }
  }

  /**
   * Soft delete a parent
   */
  async deleteParent(parentId: number, user: UserData) {
    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const parent = await this.authRepository.findOne({
      where: {
        id: parentId,
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found in your institution.');
    }

    try {
      await this.authRepository.softDelete(parentId);
      return { success: true, message: 'Parent deleted successfully' };
    } catch {
      throw new InternalServerErrorException('Failed to delete parent');
    }
  }

  /**
   * Add students to a parent's link list
   */
  async addStudents(
    parentId: number,
    addStudentsDto: AddStudentsDto,
    user: UserData,
  ) {
    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const { studentProfileIds } = addStudentsDto;

    if (!studentProfileIds || studentProfileIds.length === 0) {
      throw new BadRequestException('At least one student must be provided.');
    }

    const parent = await this.authRepository.findOne({
      where: {
        id: parentId,
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found in your institution.');
    }

    // Fetch student profiles
    const studentProfiles = await this.studentProfileRepository.find({
      where: {
        id: In(studentProfileIds),
        institution: { prefix: user.institutionId },
      },
    });

    if (studentProfiles.length !== studentProfileIds.length) {
      throw new BadRequestException(
        'One or more students not found in your institution.',
      );
    }

    // Check for existing links (either to this parent or other parents)
    const existingLinks = await this.parentStudentRepository.find({
      where: {
        studentProfile: { id: In(studentProfileIds) },
      },
    });

    // Check for conflicts
    const otherParentLinks = existingLinks.filter(
      (link) => link.parent.id !== parentId,
    );
    if (otherParentLinks.length > 0) {
      throw new ConflictException(
        'One or more students are already linked to another parent.',
      );
    }

    // Get already linked student IDs for this parent
    const alreadyLinked = existingLinks
      .filter((link) => link.parent.id === parentId)
      .map((link) => link.studentProfile.id);
    const newStudentIds = studentProfileIds.filter(
      (id) => !alreadyLinked.includes(id),
    );

    if (newStudentIds.length === 0) {
      throw new ConflictException(
        'All students are already linked to this parent.',
      );
    }

    // Create new relations
    const newRelations = studentProfiles
      .filter((sp) => newStudentIds.includes(sp.id))
      .map((studentProfile) =>
        this.parentStudentRepository.create({
          parent: { id: parentId } as AuthEntity,
          studentProfile: { id: studentProfile.id } as StudentProfileEntity,
        }),
      );

    try {
      await this.parentStudentRepository.save(newRelations);

      const totalLinked = await this.parentStudentRepository.count({
        where: { parent: { id: parentId } },
      });

      return {
        success: true,
        message: `${newStudentIds.length} student(s) added to parent.`,
        addedCount: newStudentIds.length,
        totalLinkedCount: totalLinked,
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to add students to parent',
      );
    }
  }

  /**
   * Remove students from a parent's link list
   */
  async removeStudents(
    parentId: number,
    removeStudentsDto: RemoveStudentsDto,
    user: UserData,
  ) {
    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const { studentProfileIds } = removeStudentsDto;

    if (!studentProfileIds || studentProfileIds.length === 0) {
      throw new BadRequestException('At least one student must be provided.');
    }

    const parent = await this.authRepository.findOne({
      where: {
        id: parentId,
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found in your institution.');
    }

    try {
      const result = await this.parentStudentRepository.delete({
        parent: { id: parentId },
        studentProfile: { id: In(studentProfileIds) },
      });

      const totalLinked = await this.parentStudentRepository.count({
        where: { parent: { id: parentId } },
      });

      return {
        success: true,
        message: `${result.affected} student(s) removed from parent.`,
        removedCount: result.affected || 0,
        totalLinkedCount: totalLinked,
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to remove students from parent',
      );
    }
  }

  /**
   * Get all students linked to a parent
   */
  async getLinkedStudents(parentId: number, user: UserData) {
    if (!user?.institutionId)
      throw new NotFoundException('Unable to find your institution.');

    const parent = await this.authRepository.findOne({
      where: {
        id: parentId,
        institution: { prefix: user.institutionId },
        role: UserRoles.PARENT,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found in your institution.');
    }

    const links = await this.parentStudentRepository.find({
      where: { parent: { id: parentId } },
      relations: ['studentProfile', 'studentProfile.student'],
    });

    return {
      parentId,
      linkedStudents: links.map((link) => ({
        studentProfileId: link.studentProfile.id,
        studentName: link.studentProfile.student?.name,
        studentUsername: link.studentProfile.student?.username,
        linkedAt: link.createdAt,
      })),
    };
  }

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Creates a parent login using the old ParentLoginEntity model
   */
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

  /**
   * DEPRECATED: Legacy method for backward compatibility
   * Resets parent password using the old ParentLoginEntity model
   */
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
