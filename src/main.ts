import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadSecrets } from './config/secret.config';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}

async function main() {
  try {
    await loadSecrets();
    await bootstrap();
    logger.log(
      `Application started successfully at port ${process.env.PORT ?? 3000}`,
    );
  } catch (error) {
    logger.error(
      'Failed to start application:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

void main();
