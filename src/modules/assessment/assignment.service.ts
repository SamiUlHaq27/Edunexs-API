import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignmentAttachmentEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AssignmentSubmissionStatus,
  AssessmentTypes,
  AuthEntity,
  FileEntity,
  GradeEntity,
  GradeTypes,
  SectionOfferingEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { AppwriteStorageService } from 'src/shared/services';
import type { UserData } from 'src/shared/types';
import { In, Like, Repository } from 'typeorm';
import {
  CreateAssignmentDto,
  GradeAssignmentDto,
  ListAssignmentSubmissionsDto,
  ListStudentAssignmentsDto,
  ListTeacherAssignmentsDto,
  SubmitAssignmentDto,
} from './dtos';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentAttachmentEntity)
    private readonly assignmentAttachmentRepository: Repository<AssignmentAttachmentEntity>,
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmissionEntity>,
    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly appwriteStorageService: AppwriteStorageService,
  ) {}

  async createAssignment(
    createAssignmentDto: CreateAssignmentDto,
    user: UserData,
    files: Express.Multer.File[],
  ) {
    const offering = await this.getTeacherOwnedOffering(
      createAssignmentDto.offeringId,
      user,
    );

    const dueDate = new Date(createAssignmentDto.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('Invalid due date');
    }

    if (createAssignmentDto.maxGrade <= 0) {
      throw new BadRequestException('maxGrade must be greater than zero');
    }

    const assignment = this.assignmentRepository.create({
      assessmentType:
        createAssignmentDto.assessmentType || AssessmentTypes.ASSIGNMENT,
      title: createAssignmentDto.title,
      description: createAssignmentDto.description,
      dueDate,
      maxGrade: createAssignmentDto.maxGrade,
      sectionOffering: { id: offering.id },
      createdByTeacher: { id: user.authId },
      isActive: true,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    const attachments: AssignmentAttachmentEntity[] = [];

    for (const file of files) {
      this.ensureFileSizeLimit(file);
      const savedFile = await this.uploadAndSaveFile(file);

      const attachment = this.assignmentAttachmentRepository.create({
        assignment: { id: savedAssignment.id },
        file: { id: savedFile.id },
      });
      attachments.push(attachment);
    }

    if (attachments.length > 0) {
      await this.assignmentAttachmentRepository.save(attachments);
    }

    const created = await this.assignmentRepository.findOne({
      where: { id: savedAssignment.id },
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
    });

    const attachmentRows = await this.assignmentAttachmentRepository.find({
      where: { assignment: { id: savedAssignment.id } },
      relations: ['file'],
      order: { id: 'ASC' },
    });

    return {
      id: savedAssignment.id,
      assessmentType: savedAssignment.assessmentType,
      title: savedAssignment.title,
      description: savedAssignment.description,
      dueDate: savedAssignment.dueDate,
      maxGrade: Number(savedAssignment.maxGrade),
      offering: {
        id: created?.sectionOffering?.id,
        sectionName: created?.sectionOffering?.section?.name,
        courseName: created?.sectionOffering?.course?.title,
      },
      attachments: attachmentRows.map((row) => this.mapFile(row.file)),
      createdAt: savedAssignment.createdAt,
    };
  }

  async listTeacherAssignments(
    listTeacherAssignmentsDto: ListTeacherAssignmentsDto,
    user: UserData,
  ) {
    const { page, size, offeringId, title, assessmentType, isActive } =
      listTeacherAssignmentsDto;
    const skip = (page - 1) * size;

    const where: Record<string, unknown> = {
      sectionOffering: { teacher: { id: user.authId } },
    };

    if (offeringId) {
      where.sectionOffering = { id: offeringId, teacher: { id: user.authId } };
    }

    if (title) {
      where.title = Like(`%${title}%`);
    }

    if (assessmentType) {
      where.assessmentType = assessmentType;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const [assignments, total] = await this.assignmentRepository.findAndCount({
      where,
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
      order: { dueDate: 'ASC', createdAt: 'DESC' },
      skip,
      take: size,
    });

    const assignmentIds = assignments.map((assignment) => assignment.id);

    const attachments =
      assignmentIds.length > 0
        ? await this.assignmentAttachmentRepository.find({
            where: { assignment: { id: In(assignmentIds) } },
            relations: ['assignment', 'file'],
          })
        : [];

    const submissions =
      assignmentIds.length > 0
        ? await this.assignmentSubmissionRepository.find({
            where: { assignment: { id: In(assignmentIds) } },
            relations: ['assignment'],
          })
        : [];

    const grades =
      assignmentIds.length > 0
        ? await this.gradeRepository.find({
            where: {
              assessmentId: In(assignmentIds),
              gradeType: GradeTypes.ASSIGNMENT,
            },
          })
        : [];

    const attachmentMap = new Map<number, ReturnType<typeof this.mapFile>[]>();
    for (const row of attachments) {
      const id = row.assignment?.id;
      if (!id) continue;
      const current = attachmentMap.get(id) || [];
      current.push(this.mapFile(row.file));
      attachmentMap.set(id, current);
    }

    const submissionCountMap = new Map<number, number>();
    for (const row of submissions) {
      const id = row.assignment?.id;
      if (!id) continue;
      submissionCountMap.set(id, (submissionCountMap.get(id) || 0) + 1);
    }

    const gradedCountMap = new Map<number, number>();
    for (const row of grades) {
      const id = row.assessmentId;
      if (!id) continue;
      gradedCountMap.set(id, (gradedCountMap.get(id) || 0) + 1);
    }

    return {
      data: assignments.map((assignment) => ({
        id: assignment.id,
        assessmentType: assignment.assessmentType,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxGrade: Number(assignment.maxGrade),
        isActive: assignment.isActive,
        offering: {
          id: assignment.sectionOffering?.id,
          sectionName: assignment.sectionOffering?.section?.name,
          courseName: assignment.sectionOffering?.course?.title,
        },
        attachments: attachmentMap.get(assignment.id) || [],
        submissionCount: submissionCountMap.get(assignment.id) || 0,
        gradedCount: gradedCountMap.get(assignment.id) || 0,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async listAssignmentSubmissions(
    listAssignmentSubmissionsDto: ListAssignmentSubmissionsDto,
    user: UserData,
  ) {
    const assignment = await this.getTeacherOwnedAssignment(
      listAssignmentSubmissionsDto.assignmentId,
      user,
    );

    const { page, size, studentProfileId, status, isLate } =
      listAssignmentSubmissionsDto;
    const skip = (page - 1) * size;

    const where: Record<string, unknown> = {
      assignment: { id: assignment.id },
    };

    if (studentProfileId) {
      where.studentProfile = { id: studentProfileId };
    }

    if (status) {
      where.status = status;
    }

    if (typeof isLate === 'boolean') {
      where.isLate = isLate;
    }

    const [submissions, total] =
      await this.assignmentSubmissionRepository.findAndCount({
        where,
        relations: [
          'studentProfile',
          'studentProfile.student',
          'submittedFile',
        ],
        order: { submittedAt: 'DESC' },
        skip,
        take: size,
      });

    const profileIds = submissions.map(
      (submission) => submission.studentProfile.id,
    );

    const grades =
      profileIds.length > 0
        ? await this.gradeRepository.find({
            where: {
              gradeType: GradeTypes.ASSIGNMENT,
              assessmentId: assignment.id,
              studentProfile: { id: In(profileIds) },
            },
            relations: ['studentProfile', 'gradedByTeacher'],
          })
        : [];

    const gradeMap = new Map<number, GradeEntity>();
    for (const grade of grades) {
      if (grade.studentProfile?.id) {
        gradeMap.set(grade.studentProfile.id, grade);
      }
    }

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        maxGrade: Number(assignment.maxGrade),
      },
      data: submissions.map((submission) => {
        const grade = gradeMap.get(submission.studentProfile.id);

        return {
          submissionId: submission.id,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
          status: submission.status,
          studentProfileId: submission.studentProfile.id,
          studentId: submission.studentProfile.student?.id,
          studentName: submission.studentProfile.student?.name,
          rollNo: submission.studentProfile.rollNo,
          submissionFile: this.mapFile(submission.submittedFile),
          grade: grade
            ? {
                id: grade.id,
                score: Number(grade.score),
                feedback: grade.feedback,
                gradedByTeacherId: grade.gradedByTeacher?.id,
                gradedAt: grade.updatedAt,
              }
            : null,
        };
      }),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async gradeAssignment(
    gradeAssignmentDto: GradeAssignmentDto,
    user: UserData,
  ) {
    const assignment = await this.getTeacherOwnedAssignment(
      gradeAssignmentDto.assignmentId,
      user,
    );

    if (gradeAssignmentDto.score > Number(assignment.maxGrade)) {
      throw new BadRequestException(
        `Score cannot exceed maxGrade (${assignment.maxGrade})`,
      );
    }

    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        id: gradeAssignmentDto.studentProfileId,
        sectionOfferings: { id: assignment.sectionOffering.id },
      },
      relations: ['student', 'sectionOfferings'],
    });

    if (!studentProfile) {
      throw new NotFoundException(
        'Student is not enrolled in this assignment offering',
      );
    }

    let grade = await this.gradeRepository.findOne({
      where: {
        gradeType: GradeTypes.ASSIGNMENT,
        assessmentId: assignment.id,
        studentProfile: { id: studentProfile.id },
        sectionOffering: { id: assignment.sectionOffering.id },
      },
      relations: ['studentProfile', 'sectionOffering'],
    });

    if (!grade) {
      grade = this.gradeRepository.create({
        gradeType: GradeTypes.ASSIGNMENT,
        assessmentId: assignment.id,
        studentProfile: { id: studentProfile.id },
        sectionOffering: { id: assignment.sectionOffering.id },
        gradedByTeacher: { id: user.authId },
        score: gradeAssignmentDto.score,
        feedback: gradeAssignmentDto.feedback,
      });
    } else {
      grade.score = gradeAssignmentDto.score;
      grade.feedback = gradeAssignmentDto.feedback;
      grade.gradedByTeacher = { id: user.authId } as AuthEntity;
    }

    const savedGrade = await this.gradeRepository.save(grade);

    const submission = await this.assignmentSubmissionRepository.findOne({
      where: {
        assignment: { id: assignment.id },
        studentProfile: { id: studentProfile.id },
      },
    });

    if (submission) {
      submission.status = AssignmentSubmissionStatus.GRADED;
      await this.assignmentSubmissionRepository.save(submission);
    }

    return {
      gradeId: savedGrade.id,
      assignmentId: assignment.id,
      studentProfileId: studentProfile.id,
      studentId: studentProfile.student?.id,
      studentName: studentProfile.student?.name,
      score: Number(savedGrade.score),
      maxGrade: Number(assignment.maxGrade),
      feedback: savedGrade.feedback,
      gradeType: savedGrade.gradeType,
      gradedAt: savedGrade.updatedAt,
    };
  }

  async listStudentAssignments(
    listStudentAssignmentsDto: ListStudentAssignmentsDto,
    user: UserData,
  ) {
    const studentProfile = await this.getStudentProfileForUser(user.authId);

    const offeringIds = (studentProfile.sectionOfferings || []).map(
      (offering) => offering.id,
    );

    if (offeringIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: listStudentAssignmentsDto.page,
        size: listStudentAssignmentsDto.size,
        totalPages: 0,
      };
    }

    const { page, size, offeringId, assessmentType, submissionStatus } =
      listStudentAssignmentsDto;
    const skip = (page - 1) * size;

    const where: Record<string, unknown> = {
      sectionOffering: { id: In(offeringIds) },
      isActive: true,
    };

    if (offeringId) {
      if (!offeringIds.includes(offeringId)) {
        throw new ForbiddenException('Offering does not belong to the student');
      }
      where.sectionOffering = { id: offeringId };
    }

    if (assessmentType) {
      where.assessmentType = assessmentType;
    }

    const [assignments, total] = await this.assignmentRepository.findAndCount({
      where,
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
      order: { dueDate: 'ASC', createdAt: 'DESC' },
      skip,
      take: size,
    });

    const assignmentIds = assignments.map((assignment) => assignment.id);

    const attachments =
      assignmentIds.length > 0
        ? await this.assignmentAttachmentRepository.find({
            where: { assignment: { id: In(assignmentIds) } },
            relations: ['assignment', 'file'],
          })
        : [];

    const submissions =
      assignmentIds.length > 0
        ? await this.assignmentSubmissionRepository.find({
            where: {
              assignment: { id: In(assignmentIds) },
              studentProfile: { id: studentProfile.id },
            },
            relations: ['assignment', 'submittedFile'],
          })
        : [];

    const grades =
      assignmentIds.length > 0
        ? await this.gradeRepository.find({
            where: {
              assessmentId: In(assignmentIds),
              studentProfile: { id: studentProfile.id },
              gradeType: GradeTypes.ASSIGNMENT,
            },
          })
        : [];

    const attachmentMap = new Map<number, ReturnType<typeof this.mapFile>[]>();
    for (const row of attachments) {
      const id = row.assignment?.id;
      if (!id) continue;
      const current = attachmentMap.get(id) || [];
      current.push(this.mapFile(row.file));
      attachmentMap.set(id, current);
    }

    const submissionMap = new Map<number, AssignmentSubmissionEntity>();
    for (const row of submissions) {
      if (row.assignment?.id) {
        submissionMap.set(row.assignment.id, row);
      }
    }

    const gradeMap = new Map<number, GradeEntity>();
    for (const row of grades) {
      if (row.assessmentId) {
        gradeMap.set(row.assessmentId, row);
      }
    }

    const mapped = assignments.map((assignment) => {
      const submission = submissionMap.get(assignment.id);
      const grade = gradeMap.get(assignment.id);
      const currentStatus = submission
        ? submission.status
        : ('not_submitted' as const);

      return {
        id: assignment.id,
        assessmentType: assignment.assessmentType,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxGrade: Number(assignment.maxGrade),
        isOverdue: assignment.dueDate < new Date(),
        offering: {
          id: assignment.sectionOffering?.id,
          sectionName: assignment.sectionOffering?.section?.name,
          courseName: assignment.sectionOffering?.course?.title,
        },
        attachments: attachmentMap.get(assignment.id) || [],
        submission: submission
          ? {
              id: submission.id,
              submittedAt: submission.submittedAt,
              isLate: submission.isLate,
              status: submission.status,
              file: this.mapFile(submission.submittedFile),
            }
          : null,
        grade: grade
          ? {
              id: grade.id,
              score: Number(grade.score),
              feedback: grade.feedback,
              gradedAt: grade.updatedAt,
            }
          : null,
        status: currentStatus,
        createdAt: assignment.createdAt,
      };
    });

    const filtered = submissionStatus
      ? mapped.filter((row) => row.status === submissionStatus)
      : mapped;

    return {
      data: filtered,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async submitAssignment(
    submitAssignmentDto: SubmitAssignmentDto,
    user: UserData,
    file: Express.Multer.File,
  ) {
    this.ensureFileSizeLimit(file);

    const studentProfile = await this.getStudentProfileForUser(user.authId);
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: submitAssignmentDto.assignmentId,
        isActive: true,
      },
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const studentOfferingIds = new Set(
      (studentProfile.sectionOfferings || []).map((offering) => offering.id),
    );

    if (!studentOfferingIds.has(assignment.sectionOffering.id)) {
      throw new ForbiddenException(
        'You are not enrolled in the assignment offering',
      );
    }

    const savedFile = await this.uploadAndSaveFile(file);

    const submittedAt = new Date();
    const isLate = submittedAt > assignment.dueDate;

    let submission = await this.assignmentSubmissionRepository.findOne({
      where: {
        assignment: { id: assignment.id },
        studentProfile: { id: studentProfile.id },
      },
      relations: ['submittedFile'],
    });

    if (!submission) {
      submission = this.assignmentSubmissionRepository.create({
        assignment: { id: assignment.id },
        studentProfile: { id: studentProfile.id },
        submittedFile: { id: savedFile.id },
        submittedAt,
        isLate,
        status: AssignmentSubmissionStatus.SUBMITTED,
      });
    } else {
      submission.submittedFile = { id: savedFile.id } as FileEntity;
      submission.submittedAt = submittedAt;
      submission.isLate = isLate;
      submission.status = AssignmentSubmissionStatus.SUBMITTED;
    }

    const savedSubmission =
      await this.assignmentSubmissionRepository.save(submission);

    return {
      submissionId: savedSubmission.id,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        maxGrade: Number(assignment.maxGrade),
        offeringId: assignment.sectionOffering.id,
      },
      studentProfileId: studentProfile.id,
      submittedAt: savedSubmission.submittedAt,
      isLate: savedSubmission.isLate,
      status: savedSubmission.status,
      file: this.mapFile(savedFile),
      message: 'Assignment submitted successfully',
    };
  }

  private async getTeacherOwnedOffering(offeringId: number, user: UserData) {
    const offering = await this.sectionOfferingRepository.findOne({
      where: {
        id: offeringId,
        teacher: { id: user.authId },
      },
      relations: ['teacher', 'course', 'section'],
    });

    if (!offering) {
      throw new NotFoundException(
        'Section offering not found for this teacher',
      );
    }

    return offering;
  }

  private async getTeacherOwnedAssignment(
    assignmentId: number,
    user: UserData,
  ) {
    const assignment = await this.assignmentRepository.findOne({
      where: {
        id: assignmentId,
        sectionOffering: {
          teacher: { id: user.authId },
        },
      },
      relations: [
        'sectionOffering',
        'sectionOffering.teacher',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found for this teacher');
    }

    return assignment;
  }

  private async getStudentProfileForUser(authId: number) {
    const studentProfile = await this.studentProfileRepository.findOne({
      where: { student: { id: authId } },
      relations: ['student', 'sectionOfferings'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    return studentProfile;
  }

  private ensureFileSizeLimit(file: Express.Multer.File) {
    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }
  }

  private async uploadAndSaveFile(file: Express.Multer.File) {
    try {
      const uploadResult = await this.appwriteStorageService.uploadFile({
        file: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
      });

      const fileRecord = this.fileRepository.create({
        fileName: uploadResult.fileName,
        fileId: uploadResult.fileId,
        mimeType: uploadResult.mimeType,
        sizeOriginal: uploadResult.sizeOriginal,
      });

      return await this.fileRepository.save(fileRecord);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private mapFile(file?: FileEntity | null) {
    if (!file) {
      return null;
    }

    return {
      dbFileId: file.id,
      appwriteFileId: file.fileId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeOriginal: Number(file.sizeOriginal),
      publicUrl: this.appwriteStorageService.getFileViewUrl({
        fileId: file.fileId,
      }),
    };
  }
}
