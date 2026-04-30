import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CourseEntity } from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { InstitutionContextService } from 'src/shared/services';
import { CreateCourseDto, DeleteCourseDto, UpdateCourseDto } from '../dtos';
import { ListFiltersDto } from 'src/shared/dtos';
import { UserData } from 'src/shared/types';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async create(createCourseDto: CreateCourseDto, user: UserData) {
    const managerInstitution = await this.getManagerInstitution(user);
    const { code, title, description } = createCourseDto;

    const existingCourse = await this.courseRepository.findOne({
      where: {
        code,
        institution: { id: managerInstitution.id },
      },
      relations: ['institution'],
    });

    if (existingCourse) {
      throw new ConflictException(
        'Course with this code already exists in your institution',
      );
    }

    const newCourse = this.courseRepository.create({
      code,
      title,
      description,
      institution: { id: managerInstitution.id },
      isActive: true,
    });

    try {
      const savedCourse = await this.courseRepository.save(newCourse);

      return {
        id: savedCourse.id,
        code: savedCourse.code,
        title: savedCourse.title,
        description: savedCourse.description,
        isActive: savedCourse.isActive,
        institutionPrefix: managerInstitution.prefix,
        createdAt: savedCourse.createdAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create course');
    }
  }

  async list(getCoursesFilters: ListFiltersDto, user: UserData) {
    const managerInstitution = await this.getManagerInstitution(user);
    const { page, size, filters } = getCoursesFilters;
    const skip = (page - 1) * size;

    const where: FindOptionsWhere<CourseEntity> = {
      institution: { id: managerInstitution.id },
    };

    if (filters && typeof filters === 'object') {
      const typedFilters = filters as Record<string, unknown>;

      if (typeof typedFilters.code === 'string') {
        where.code = Like(`%${typedFilters.code}%`);
      }

      if (typeof typedFilters.title === 'string') {
        where.title = Like(`%${typedFilters.title}%`);
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

    const [data, total] = await this.courseRepository.findAndCount({
      where,
      relations: ['institution'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async update(updateCourseDto: UpdateCourseDto, user: UserData) {
    const managerInstitution = await this.getManagerInstitution(user);
    const { courseId, code, title, description, isActive } = updateCourseDto;

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['institution'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.institution.id !== managerInstitution.id) {
      throw new ForbiddenException(
        'You are not allowed to update courses outside your institution',
      );
    }

    if (code && code !== course.code) {
      const existingCourse = await this.courseRepository.findOne({
        where: {
          code,
          institution: { id: managerInstitution.id },
        },
        relations: ['institution'],
      });

      if (existingCourse && existingCourse.id !== courseId) {
        throw new ConflictException(
          'Course with this code already exists in your institution',
        );
      }
    }

    if (code !== undefined) course.code = code;
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (isActive !== undefined) course.isActive = isActive;

    try {
      const updatedCourse = await this.courseRepository.save(course);

      return {
        id: updatedCourse.id,
        code: updatedCourse.code,
        title: updatedCourse.title,
        description: updatedCourse.description,
        isActive: updatedCourse.isActive,
        institutionPrefix: managerInstitution.prefix,
        updatedAt: updatedCourse.updatedAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to update course');
    }
  }

  async delete(deleteCourseDto: DeleteCourseDto, user: UserData) {
    const managerInstitution = await this.getManagerInstitution(user);
    const { courseId } = deleteCourseDto;

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['institution'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.institution.id !== managerInstitution.id) {
      throw new ForbiddenException(
        'You are not allowed to delete courses outside your institution',
      );
    }

    try {
      await this.courseRepository.softDelete(courseId);

      return {
        success: true,
        message: 'Course deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete course');
    }
  }

  private async getManagerInstitution(user: UserData) {
    if (
      user.role !== UserRoles.INSTITUTION_OWNER &&
      user.role !== UserRoles.INSTITUTION_ADMIN
    ) {
      throw new ForbiddenException(
        'You are not allowed to manage institution courses',
      );
    }
    return await this.institutionContextService.getManagerInstitution(user);
  }
}
