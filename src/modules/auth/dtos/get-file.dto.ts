import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetFileDto {
  @IsUUID()
  @IsNotEmpty()
  fileId: string;
}
