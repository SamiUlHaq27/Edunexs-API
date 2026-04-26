import { ArrayUnique, IsArray, IsInt, IsOptional } from 'class-validator';

export class CreateSectionOfferingDto {
  @IsInt()
  sectionId: number;

  @IsInt()
  courseId: number;

  @IsInt()
  teacherId: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  studentProfileIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  studentGroupIds?: number[];
}
