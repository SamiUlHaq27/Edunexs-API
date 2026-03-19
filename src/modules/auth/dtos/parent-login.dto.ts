import { IsOptional, IsString } from 'class-validator';

export class ParentLoginDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  password: string;
}
