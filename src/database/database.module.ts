import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getSecretValue } from 'src/config/secret.config';
import { AuthEntity, InstitutionEntity } from './entities';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: getSecretValue('DB_HOST'),
        port: parseInt(getSecretValue('DB_PORT') || ''),
        username: getSecretValue('DB_USER'),
        password: getSecretValue('DB_PASSWORD'),
        database: getSecretValue('DB_NAME'),
        entities: [AuthEntity, InstitutionEntity],
        synchronize: false,
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class DatabaseModule {}
