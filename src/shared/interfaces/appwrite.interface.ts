export interface UploadFileOptions {
  file: Buffer | File;
  fileName: string;
  mimeType?: string;
}

export interface UploadFileResult {
  fileId: string;
  fileName: string;
  bucketId: string;
  sizeOriginal: number;
  mimeType: string;
  createdAt: string;
}

export interface GetFileUrlOptions {
  fileId: string;
  width?: number;
  height?: number;
  quality?: number;
}

export interface DeleteFileResult {
  success: boolean;
  message: string;
}
