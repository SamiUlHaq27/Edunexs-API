import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getSecretValue } from 'src/config/secret.config';

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
        entities: ['src/database/entities/*.entity.ts'],
        synchronize: false,
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class DatabaseModule {}
