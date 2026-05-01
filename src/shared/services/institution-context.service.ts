import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthEntity, InstitutionEntity } from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { UserData } from 'src/shared/types';
import { Repository } from 'typeorm';

@Injectable()
export class InstitutionContextService {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
  ) {}

  async getManagerInstitution(user: UserData) {
    if (
      user.role !== UserRoles.INSTITUTION_OWNER &&
      user.role !== UserRoles.INSTITUTION_ADMIN
    ) {
      throw new ForbiddenException(
        'You are not allowed to manage institution resources',
      );
    }

    if (user.institutionId) {
      const institution = await this.institutionRepository.findOne({
        where: { id: user.institutionId },
      });

      if (institution) {
        return institution;
      }
    }

    const authUser = await this.authRepository.findOne({
      where: { id: user.authId },
      relations: ['institution'],
    });

    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    if (authUser.role === UserRoles.INSTITUTION_OWNER) {
      const institution = await this.institutionRepository.findOne({
        where: { owner: { id: authUser.id } },
        relations: ['owner'],
      });

      if (!institution) {
        throw new NotFoundException(
          'You must have an institution to manage these resources',
        );
      }

      return institution;
    }

    if (!authUser.institution?.id) {
      throw new ForbiddenException(
        'User account is not linked to an institution',
      );
    }

    const institution = await this.institutionRepository.findOne({
      where: { id: authUser.institution.id },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found for this user');
    }

    return institution;
  }
}
