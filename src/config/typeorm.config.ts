import { DataSource } from 'typeorm';
import { getSecretValue } from './secret.config';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: getSecretValue('DB_HOST'),
  port: parseInt(getSecretValue('DB_PORT') || ''),
  database: getSecretValue('DB_NAME'),
  username: getSecretValue('DB_USER'),
  password: getSecretValue('DB_PASSWORD'),
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*-migration.ts'],
  migrationsRun: false,
  logging: false,
});

export default AppDataSource;
