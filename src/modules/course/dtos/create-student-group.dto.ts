import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  studentProfileIds: number[];
}
