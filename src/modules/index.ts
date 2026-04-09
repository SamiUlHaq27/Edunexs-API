import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { InstitutionModule } from './institution/institution.module';
import { SectionModule } from './section/section.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AssessmentModule } from './assessment/assessment.module';

export const AllModules = [
  AuthModule,
  InstitutionModule,
  CourseModule,
  SectionModule,
  AttendanceModule,
  AssessmentModule,
];
