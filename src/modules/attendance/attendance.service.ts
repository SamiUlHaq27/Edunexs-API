import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AttendanceEntity,
  AttendanceStatus,
} from 'src/database/entities/attendance.entity';
import { ParentStudentEntity } from 'src/database/entities/parent-student.entity';
import { SectionOfferingEntity } from 'src/database/entities/section-offering.entity';
import { StudentProfileEntity } from 'src/database/entities/student-profile.entity';
import type { UserData } from 'src/shared/types';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  ListStudentAttendanceDto,
  ListTeacherAttendanceDto,
  MarkAttendanceDto,
  TeacherAttendanceReportDto,
} from './dtos';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepository: Repository<AttendanceEntity>,
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(ParentStudentEntity)
    private readonly parentStudentRepository: Repository<ParentStudentEntity>,
  ) {}

  async markAttendance(markAttendanceDto: MarkAttendanceDto, user: UserData) {
    const offering = await this.getTeacherOwnedOffering(
      markAttendanceDto.offeringId,
      user,
      true,
    );

    const attendanceDate = this.normalizeDate(markAttendanceDto.attendanceDate);
    const studentProfileIds = markAttendanceDto.records.map(
      (record) => record.studentProfileId,
    );

    this.ensureUniqueStudentRecords(studentProfileIds);
    this.ensureAllStudentsBelongToOffering(studentProfileIds, offering);

    const existingRecords = await this.attendanceRepository.find({
      where: {
        sectionOffering: { id: offering.id },
        attendanceDate,
        periodSlot: markAttendanceDto.periodSlot,
        studentProfile: { id: In(studentProfileIds) },
      },
      relations: ['studentProfile', 'studentProfile.student'],
    });

    const existingMap = new Map(
      existingRecords.map((record) => [record.studentProfile.id, record]),
    );

    const savePayload = markAttendanceDto.records.map((record) => {
      const existing = existingMap.get(record.studentProfileId);

      if (existing) {
        existing.status = record.status;
        return existing;
      }

      return this.attendanceRepository.create({
        sectionOffering: { id: offering.id },
        studentProfile: { id: record.studentProfileId },
        attendanceDate,
        periodSlot: markAttendanceDto.periodSlot,
        status: record.status,
      });
    });

    await this.attendanceRepository.save(savePayload);

    const rows = await this.attendanceRepository.find({
      where: {
        sectionOffering: { id: offering.id },
        attendanceDate,
        periodSlot: markAttendanceDto.periodSlot,
        studentProfile: { id: In(studentProfileIds) },
      },
      relations: ['studentProfile', 'studentProfile.student'],
      order: { studentProfile: { id: 'ASC' } },
    });

    return {
      offeringId: offering.id,
      attendanceDate,
      periodSlot: markAttendanceDto.periodSlot,
      totalMarked: rows.length,
      data: rows.map((row) => this.mapAttendanceRow(row)),
    };
  }

  async listTeacherAttendance(
    listTeacherAttendanceDto: ListTeacherAttendanceDto,
    user: UserData,
  ) {
    await this.getTeacherOwnedOffering(
      listTeacherAttendanceDto.offeringId,
      user,
    );

    const skip =
      (listTeacherAttendanceDto.page - 1) * listTeacherAttendanceDto.size;

    const where: Record<string, unknown> = {
      sectionOffering: { id: listTeacherAttendanceDto.offeringId },
    };

    if (listTeacherAttendanceDto.attendanceDate) {
      where.attendanceDate = this.normalizeDate(
        listTeacherAttendanceDto.attendanceDate,
      );
    } else if (
      listTeacherAttendanceDto.fromDate &&
      listTeacherAttendanceDto.toDate
    ) {
      where.attendanceDate = Between(
        this.normalizeDate(listTeacherAttendanceDto.fromDate),
        this.normalizeDate(listTeacherAttendanceDto.toDate),
      );
    } else if (listTeacherAttendanceDto.fromDate) {
      where.attendanceDate = MoreThanOrEqual(
        this.normalizeDate(listTeacherAttendanceDto.fromDate),
      );
    } else if (listTeacherAttendanceDto.toDate) {
      where.attendanceDate = LessThanOrEqual(
        this.normalizeDate(listTeacherAttendanceDto.toDate),
      );
    }

    if (listTeacherAttendanceDto.periodSlot) {
      where.periodSlot = listTeacherAttendanceDto.periodSlot;
    }

    if (listTeacherAttendanceDto.studentProfileId) {
      where.studentProfile = { id: listTeacherAttendanceDto.studentProfileId };
    }

    const [data, total] = await this.attendanceRepository.findAndCount({
      where,
      relations: [
        'studentProfile',
        'studentProfile.student',
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
      order: {
        attendanceDate: 'DESC',
        periodSlot: 'ASC',
        studentProfile: { id: 'ASC' },
      },
      skip,
      take: listTeacherAttendanceDto.size,
    });

    return {
      data: data.map((row) => this.mapAttendanceRow(row)),
      total,
      page: listTeacherAttendanceDto.page,
      size: listTeacherAttendanceDto.size,
      totalPages: Math.ceil(total / listTeacherAttendanceDto.size),
    };
  }

  async getTeacherAttendanceReport(
    teacherAttendanceReportDto: TeacherAttendanceReportDto,
    user: UserData,
  ) {
    const offering = await this.getTeacherOwnedOffering(
      teacherAttendanceReportDto.offeringId,
      user,
    );

    const where: Record<string, unknown> = {
      sectionOffering: { id: teacherAttendanceReportDto.offeringId },
    };

    if (
      teacherAttendanceReportDto.fromDate &&
      teacherAttendanceReportDto.toDate
    ) {
      where.attendanceDate = Between(
        this.normalizeDate(teacherAttendanceReportDto.fromDate),
        this.normalizeDate(teacherAttendanceReportDto.toDate),
      );
    } else if (teacherAttendanceReportDto.fromDate) {
      where.attendanceDate = MoreThanOrEqual(
        this.normalizeDate(teacherAttendanceReportDto.fromDate),
      );
    } else if (teacherAttendanceReportDto.toDate) {
      where.attendanceDate = LessThanOrEqual(
        this.normalizeDate(teacherAttendanceReportDto.toDate),
      );
    }

    if (teacherAttendanceReportDto.periodSlot) {
      where.periodSlot = teacherAttendanceReportDto.periodSlot;
    }

    const rowsForReport = await this.attendanceRepository.find({
      where,
      relations: ['studentProfile', 'studentProfile.student'],
    });

    const summaryByProfileId = new Map<
      number,
      {
        presentCount: number;
        absentCount: number;
        totalMarked: number;
      }
    >();

    for (const row of rowsForReport) {
      const profileId = row.studentProfile?.id;

      if (!profileId) {
        continue;
      }

      const current = summaryByProfileId.get(profileId) || {
        presentCount: 0,
        absentCount: 0,
        totalMarked: 0,
      };

      if (row.status === AttendanceStatus.PRESENT) {
        current.presentCount += 1;
      } else if (row.status === AttendanceStatus.ABSENT) {
        current.absentCount += 1;
      }

      current.totalMarked += 1;
      summaryByProfileId.set(profileId, current);
    }

    const rows = (offering.students || []).map((studentProfile) => {
      const summary = summaryByProfileId.get(studentProfile.id);
      const presentCount = summary?.presentCount || 0;
      const absentCount = summary?.absentCount || 0;
      const totalMarked = summary?.totalMarked || 0;
      const attendancePercentage =
        totalMarked > 0
          ? Number(((presentCount / totalMarked) * 100).toFixed(2))
          : 0;

      return {
        studentProfileId: studentProfile.id,
        studentId: studentProfile.student?.id,
        studentName: studentProfile.student?.name,
        rollNo: studentProfile.rollNo,
        presentCount,
        absentCount,
        totalMarked,
        attendancePercentage,
      };
    });

    rows.sort((a, b) => a.studentProfileId - b.studentProfileId);

    return {
      offeringId: offering.id,
      totalStudents: rows.length,
      data: rows,
    };
  }

  async listStudentAttendance(
    listStudentAttendanceDto: ListStudentAttendanceDto,
    user: UserData,
  ) {
    let studentProfile: StudentProfileEntity | null = null;

    if (user.role === 'student') {
      studentProfile = await this.studentProfileRepository.findOne({
        where: { student: { id: user.authId } },
        relations: ['student'],
      });
    } else if (user.role === 'parent') {
      const selectedStudentProfileId =
        listStudentAttendanceDto.studentProfileId ?? user.studentProfileId;

      if (!selectedStudentProfileId) {
        throw new ForbiddenException('Parent is not linked to any student');
      }

      const link = await this.parentStudentRepository.findOne({
        where: {
          parent: { id: user.authId },
          studentProfile: { id: selectedStudentProfileId },
        },
      });

      if (!link) {
        throw new ForbiddenException(
          'You are not allowed to access this student profile',
        );
      }

      studentProfile = await this.studentProfileRepository.findOne({
        where: { id: selectedStudentProfileId },
        relations: ['student'],
      });
    } else {
      throw new ForbiddenException(
        'Only students or parents can view student attendance',
      );
    }

    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const skip =
      (listStudentAttendanceDto.page - 1) * listStudentAttendanceDto.size;

    const where: Record<string, unknown> = {
      studentProfile: { id: studentProfile.id },
    };

    if (listStudentAttendanceDto.offeringId) {
      where.sectionOffering = { id: listStudentAttendanceDto.offeringId };
    }

    if (listStudentAttendanceDto.fromDate && listStudentAttendanceDto.toDate) {
      where.attendanceDate = Between(
        this.normalizeDate(listStudentAttendanceDto.fromDate),
        this.normalizeDate(listStudentAttendanceDto.toDate),
      );
    } else if (listStudentAttendanceDto.fromDate) {
      where.attendanceDate = MoreThanOrEqual(
        this.normalizeDate(listStudentAttendanceDto.fromDate),
      );
    } else if (listStudentAttendanceDto.toDate) {
      where.attendanceDate = LessThanOrEqual(
        this.normalizeDate(listStudentAttendanceDto.toDate),
      );
    }

    if (listStudentAttendanceDto.periodSlot) {
      where.periodSlot = listStudentAttendanceDto.periodSlot;
    }

    const [data, total] = await this.attendanceRepository.findAndCount({
      where,
      relations: [
        'studentProfile',
        'studentProfile.student',
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
      order: {
        attendanceDate: 'DESC',
        periodSlot: 'ASC',
      },
      skip,
      take: listStudentAttendanceDto.size,
    });

    return {
      data: data.map((row) => this.mapAttendanceRow(row)),
      total,
      page: listStudentAttendanceDto.page,
      size: listStudentAttendanceDto.size,
      totalPages: Math.ceil(total / listStudentAttendanceDto.size),
    };
  }

  private async getTeacherOwnedOffering(
    offeringId: number,
    user: UserData,
    requireActive = false,
  ) {
    const offering = await this.sectionOfferingRepository.findOne({
      where: { id: offeringId },
      relations: [
        'teacher',
        'students',
        'students.student',
        'section',
        'course',
      ],
    });

    if (!offering) {
      throw new NotFoundException('Section offering not found');
    }

    if (offering.teacher?.id !== user.authId) {
      throw new ForbiddenException(
        'You are not allowed to access attendance for this section offering',
      );
    }

    if (requireActive && !offering.isActive) {
      throw new ConflictException(
        'Cannot mark attendance for an inactive offering',
      );
    }

    return offering;
  }

  private ensureUniqueStudentRecords(studentProfileIds: number[]) {
    if (new Set(studentProfileIds).size !== studentProfileIds.length) {
      throw new BadRequestException(
        'Duplicate student profile IDs are not allowed',
      );
    }
  }

  private ensureAllStudentsBelongToOffering(
    studentProfileIds: number[],
    offering: SectionOfferingEntity,
  ) {
    const enrolledIds = new Set((offering.students || []).map((s) => s.id));

    const invalidIds = studentProfileIds.filter((id) => !enrolledIds.has(id));

    if (invalidIds.length) {
      throw new NotFoundException(
        `Student profiles not found in this offering: ${invalidIds.join(', ')}`,
      );
    }
  }

  private normalizeDate(value: string) {
    const datePrefix = value.slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePrefix)) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }

    return datePrefix;
  }

  private mapAttendanceRow(row: AttendanceEntity) {
    return {
      id: row.id,
      offeringId: row.sectionOffering?.id,
      sectionId: row.sectionOffering?.section?.id,
      sectionName: row.sectionOffering?.section?.name,
      courseId: row.sectionOffering?.course?.id,
      courseCode: row.sectionOffering?.course?.code,
      courseTitle: row.sectionOffering?.course?.title,
      studentProfileId: row.studentProfile?.id,
      studentId: row.studentProfile?.student?.id,
      studentName: row.studentProfile?.student?.name,
      rollNo: row.studentProfile?.rollNo,
      attendanceDate: row.attendanceDate,
      periodSlot: row.periodSlot,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
