import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';
import { InstitutionEntity, FileEntity } from 'src/database/entities';
import { BrevoService } from 'src/shared/services/brevo.service';
import { AppwriteStorageService } from 'src/shared/services/appwrite-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstitutionEntity, FileEntity])],
  controllers: [InstitutionController],
  providers: [InstitutionService, BrevoService, AppwriteStorageService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
