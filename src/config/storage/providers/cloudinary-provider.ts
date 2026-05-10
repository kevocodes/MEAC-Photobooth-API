import { Inject, Injectable } from '@nestjs/common';
import {
  StorageProvider,
  StorageResponse,
} from '../interfaces/storage-provider.interface';
import { v2 as cloudinary } from 'cloudinary';
import envConfig from '../../environment/env.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  constructor(
    @Inject(envConfig.KEY)
    private readonly config: ConfigType<typeof envConfig>,
  ) {}

  async uploadFile(file: Express.Multer.File, folder: string = ''): Promise<StorageResponse> {
    const buffer = await file.buffer;
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `${this.config.cloudinary.folder}/${folder}`,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  async uploadFiles(files: Express.Multer.File[], folder: string): Promise<StorageResponse[]> {
    const uploads = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploads);
  }

  async deleteFiles(publicIds: string[]): Promise<unknown> {
    return cloudinary.api.delete_resources(publicIds, { type: 'upload' });
  }

  async getFileBuffer(publicId: string): Promise<Buffer> {
    const result = await cloudinary.url(publicId, { resource_type: 'image' });
    const response = await fetch(result);
    return Buffer.from(await response.arrayBuffer());
  }

  async uploadBuffer(buffer: Buffer, filename: string, folder: string): Promise<StorageResponse> {
    const base64 = buffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `${this.config.cloudinary.folder}/${folder}`,
      public_id: filename.replace(/\.[^/.]+$/, ''),
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }
}