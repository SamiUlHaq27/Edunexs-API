import { DataSource } from 'typeorm';
import { getSecretValue } from './secret.config';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: getSecretValue('DB_HOST'),
  port: parseInt(getSecretValue('DB_PORT') || ''),
  username: getSecretValue('DB_USER'),
  password: getSecretValue('DB_PASSWORD'),
  database: getSecretValue('DB_NAME'),
  ssl: true,
  extra: { ssl: { rejectUnauthorized: false } },
  synchronize: false,
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*-migration.ts'],
  migrationsRun: false,
  logging: true,
});

export default AppDataSource;
