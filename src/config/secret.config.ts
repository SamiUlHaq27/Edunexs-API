import { SecretNames, Secrets } from './secret_names.type';
import DopplerSDK from '@dopplerhq/node-sdk';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';

config();

const logger = new Logger('SecretsConfig');

export async function loadSecrets(): Promise<void> {
  const accessToken = process.env.DOPPLER_SERVICE_TOKEN;
  const project = process.env.DOPPLER_PROJECT ?? '';
  const dopplerConfig = process.env.DOPPLER_CONFIG ?? '';

  if (!accessToken) {
    logger.warn(
      'DOPPLER_SERVICE_TOKEN is not set. Skipping Doppler secret loading.',
    );
  } else {
    logger.log(
      `Loading secrets from Doppler (project: ${project || 'token-default'}, config: ${dopplerConfig || 'token-default'})`,
    );

    try {
      const doppler = new DopplerSDK({
        accessToken,
      });

      const secrets = (await doppler.secrets.download(project, dopplerConfig, {
        format: 'json',
      })) as Record<string, unknown>;

      let loadedCount = 0;
      let skippedCount = 0;

      for (const [key, value] of Object.entries(secrets)) {
        if (process.env[key] !== undefined) {
          skippedCount += 1;
          continue;
        }

        if (typeof value === 'string') {
          process.env[key] = value;
          loadedCount += 1;
        }
      }

      logger.log(
        `Doppler secrets loaded successfully. Added: ${loadedCount}, skipped existing: ${skippedCount}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load secrets from Doppler: ${message}`);
    }
  }

  const missingSecrets = Secrets.filter((secretName) => {
    const value = process.env[secretName];
    return value === undefined || value.trim() === '';
  });

  if (missingSecrets.length > 0) {
    const message = `Missing required secrets: ${missingSecrets.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }

  logger.log('All required secrets are available.');
}

export function getSecretValue(key: SecretNames): string | undefined {
  logger.debug(`Called getSecretValue with key: ${key}`);
  return process.env?.[key];
}
