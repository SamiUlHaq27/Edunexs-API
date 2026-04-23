import {
  Body,
  Controller,
  Delete,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/shared/pipes';
import { UserRoles } from 'src/shared/consts';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { ListFiltersDto } from 'src/shared/dtos';
import { CreateStudentDto } from './dtos/create-student.dto';
import { DeleteStudentDto } from './dtos/delete-student.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { StudentService } from './services';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Post()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @User() user: UserData,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.studentService.createStudent(
      createStudentDto,
      user,
      profilePicture,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Post('all')
  async listStudents(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.studentService.listStudents(listFiltersDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Put()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async updateStudent(
    @Body() updateStudentDto: UpdateStudentDto,
    @User() user: UserData,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.studentService.updateStudent(
      updateStudentDto,
      user,
      profilePicture,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Delete()
  async deleteStudent(
    @Body() deleteStudentDto: DeleteStudentDto,
    @User() user: UserData,
  ) {
    return await this.studentService.deleteStudent(deleteStudentDto, user);
  }
}
