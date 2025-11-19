import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';
import { InstitutionEntity } from 'src/database/entities';
import { BrevoService } from 'src/shared/services/brevo.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstitutionEntity])],
  controllers: [InstitutionController],
  providers: [InstitutionService, BrevoService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
