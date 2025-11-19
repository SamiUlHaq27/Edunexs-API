import { SecretNames } from './secret_names.type';
import { config } from 'dotenv';

config();

export function getSecretValue(key: SecretNames): string | undefined {
  console.log('Called getSecretValue with key:', key);
  return process.env?.[key];
}
