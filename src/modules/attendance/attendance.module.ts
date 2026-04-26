import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEntity } from 'src/database/entities/attendance.entity';
import { ParentStudentEntity } from 'src/database/entities/parent-student.entity';
import { SectionOfferingEntity } from 'src/database/entities/section-offering.entity';
import { StudentProfileEntity } from 'src/database/entities/student-profile.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceEntity,
      SectionOfferingEntity,
      StudentProfileEntity,
      ParentStudentEntity,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
