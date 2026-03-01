import { Injectable, Logger } from '@nestjs/common';
import { Client, Storage, ID } from 'node-appwrite';
import { getSecretValue } from 'src/config/secret.config';
import {
  UploadFileOptions,
  UploadFileResult,
  GetFileUrlOptions,
  DeleteFileResult,
} from '../interfaces';
import { InputFile } from 'node-appwrite/file';

@Injectable()
export class AppwriteStorageService {
  private logger = new Logger(this.constructor.name);
  private client: Client;
  private storage: Storage;
  private bucketId: string;

  constructor() {
    this.client = new Client();

    const endpoint = getSecretValue('APPWRITE_ENDPOINT');
    const projectId = getSecretValue('APPWRITE_PROJECT_ID');
    const apiKey = getSecretValue('APPWRITE_API_KEY');

    if (!endpoint || !projectId || !apiKey) {
      this.logger.error('Missing Appwrite configuration');
      throw new Error(
        'Appwrite configuration is incomplete. Please set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY.',
      );
    }

    this.client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

    this.storage = new Storage(this.client);
    this.bucketId = getSecretValue('APPWRITE_BUCKET_ID') || '';

    if (!this.bucketId) {
      this.logger.warn('APPWRITE_BUCKET_ID is not set. Using default bucket.');
    }
  }

  /**
   * Upload a file to Appwrite storage bucket
   * @param options Upload file options including file buffer/File, fileName, and optional mimeType
   * @returns Upload result with file details
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
    const { file, fileName } = options;

    try {
      const inputFile = InputFile.fromBuffer(file as Buffer, fileName);

      const response = await this.storage.createFile({
        bucketId: this.bucketId,
        fileId: ID.unique(),
        file: inputFile,
      });

      this.logger.log(
        `File uploaded successfully: ${fileName} (ID: ${response.$id})`,
      );

      return {
        fileId: response.$id,
        fileName: response.name,
        bucketId: response.bucketId,
        sizeOriginal: response.sizeOriginal,
        mimeType: response.mimeType,
        createdAt: response.$createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file: ${fileName}`,
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }
  /**
   * Get file view URL (for displaying images, PDFs, etc.)
   * @param options Options including fileId and optional width, height, quality for images
   * @returns File view URL
   */
  getFileViewUrl(options: GetFileUrlOptions): string {
    const { fileId } = options;

    try {
      const endpoint = getSecretValue('APPWRITE_ENDPOINT');
      const projectId = getSecretValue('APPWRITE_PROJECT_ID');

      // Construct the URL manually since getFileView returns content, not a URL
      const url = `${endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${projectId}`;

      this.logger.log(`Generated file view URL for ${fileId}: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to get file view URL for fileId: ${fileId}`,
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }

  /**
   * Get file download URL
   * @param fileId File ID
   * @returns File download URL
   */
  getFileDownloadUrl(fileId: string): string {
    try {
      const endpoint = getSecretValue('APPWRITE_ENDPOINT');
      const projectId = getSecretValue('APPWRITE_PROJECT_ID');

      // Construct the URL manually
      const url = `${endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/download?project=${projectId}`;

      this.logger.log(`Generated file download URL for ${fileId}: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to get file download URL for fileId: ${fileId}`,
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }

  /**
   * Get file preview URL (for images)
   * @param options Options including fileId and optional width, height, quality
   * @returns File preview URL
   */
  getFilePreviewUrl(options: GetFileUrlOptions): string {
    const { fileId, width, height, quality } = options;

    try {
      const endpoint = getSecretValue('APPWRITE_ENDPOINT');
      const projectId = getSecretValue('APPWRITE_PROJECT_ID');

      // Construct the URL manually
      let url = `${endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/preview?project=${projectId}`;

      // Add optional parameters
      if (width) {
        url += `&width=${width}`;
      }
      if (height) {
        url += `&height=${height}`;
      }
      if (quality) {
        url += `&quality=${quality}`;
      }

      this.logger.log(`Generated file preview URL for ${fileId}: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to get file preview URL for fileId: ${fileId}`,
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param fileId File ID to delete
   * @returns Delete result
   */
  async deleteFile(fileId: string): Promise<DeleteFileResult> {
    try {
      await this.storage.deleteFile({
        bucketId: this.bucketId,
        fileId: fileId,
      });

      this.logger.log(`File deleted successfully: ${fileId}`);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${fileId}`,
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param fileId File ID
   * @returns File metadata
   */
  async getFile(fileId: string) {
    try {
      const file = await this.storage.getFile({
        bucketId: this.bucketId,
        fileId: fileId,
      });

      return {
        fileId: file.$id,
        fileName: file.name,
        bucketId: file.bucketId,
        sizeOriginal: file.sizeOriginal,
        mimeType: file.mimeType,
        createdAt: file.$createdAt,
        updatedAt: file.$updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get file metadata: ${fileId}`,
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }

  /**
   * List all files in the bucket
   * @param limit Number of files to return (default: 25, max: 100)
   * @param offset Offset for pagination
   * @returns List of files
   */
  async listFiles(limit: number = 25, offset: number = 0) {
    try {
      const queries = [
        ...(limit ? [`limit(${limit})`] : []),
        ...(offset ? [`offset(${offset})`] : []),
      ];
      const response = await this.storage.listFiles(
        this.bucketId,
        queries.length > 0 ? queries : undefined,
      );

      return {
        total: response.total,
        files: response.files.map((file) => ({
          fileId: file.$id,
          fileName: file.name,
          bucketId: file.bucketId,
          sizeOriginal: file.sizeOriginal,
          mimeType: file.mimeType,
          createdAt: file.$createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(
        'Failed to list files',
        error instanceof Error ? error.message : '',
      );
      throw error;
    }
  }
}
