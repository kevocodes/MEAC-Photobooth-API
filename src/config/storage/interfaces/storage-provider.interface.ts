export interface StorageResponse {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export interface StorageProvider {
  uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<StorageResponse>;

  uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<StorageResponse[]>;

  deleteFiles(publicIds: string[]): Promise<unknown>;

  getFileBuffer(publicId: string): Promise<Buffer>;

  uploadBuffer(buffer: Buffer, filename: string, folder: string): Promise<StorageResponse>;
}