import { Inject, Injectable } from '@nestjs/common';
import {
  StorageProvider,
  StorageResponse,
} from './interfaces/storage-provider.interface';
import { CloudinaryProvider } from './providers/cloudinary-provider';
import { S3Provider } from './providers/s3-provider';
import envConfig from '../environment/env.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class StorageService implements StorageProvider {
  private readonly provider: StorageProvider;

  constructor(
    private readonly cloudinaryProvider: CloudinaryProvider,
    private readonly s3Provider: S3Provider,
    @Inject(envConfig.KEY)
    private readonly config: ConfigType<typeof envConfig>,
  ) {
    this.provider = this.getProvider();
  }

  private getProvider(): StorageProvider {
    switch (this.config.storage.provider) {
      case 's3':
        return this.s3Provider;
      case 'cloudinary':
      default:
        return this.cloudinaryProvider;
    }
  }

  async uploadFile(file: Express.Multer.File, folder?: string): Promise<StorageResponse> {
    return this.provider.uploadFile(file, folder);
  }

  async uploadFiles(files: Express.Multer.File[], folder: string): Promise<StorageResponse[]> {
    return this.provider.uploadFiles(files, folder);
  }

  async deleteFiles(publicIds: string[]): Promise<unknown> {
    return this.provider.deleteFiles(publicIds);
  }

  async getFileBuffer(publicId: string): Promise<Buffer> {
    return this.provider.getFileBuffer(publicId);
  }

  async uploadBuffer(buffer: Buffer, filename: string, folder: string): Promise<StorageResponse> {
    return this.provider.uploadBuffer(buffer, filename, folder);
  }
}