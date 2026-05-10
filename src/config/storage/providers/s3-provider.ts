import { Inject, Injectable } from '@nestjs/common';
import { StorageProvider, StorageResponse } from '../interfaces/storage-provider.interface';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import envConfig from '../../environment/env.config';
import { ConfigType } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

@Injectable()
export class S3Provider implements StorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;
  private readonly endpoint: string | null;

  constructor(
    @Inject(envConfig.KEY)
    private readonly config: ConfigType<typeof envConfig>,
  ) {
    this.s3Client = new S3Client({
      region: this.config.s3.region,
      credentials: {
        accessKeyId: this.config.s3.accessKeyId,
        secretAccessKey: this.config.s3.secretAccessKey,
      },
      ...(this.config.s3.endpoint && {
        endpoint: this.config.s3.endpoint,
        forcePathStyle: this.config.s3.forcePathStyle,
      }),
    });
    this.bucket = this.config.s3.bucket;
    this.cdnUrl = this.config.s3.cdnUrl;
    this.endpoint = this.config.s3.endpoint;
  }

  private generatePublicId(folder: string, originalName: string): string {
    const ext = originalName.split('.').pop();
    const cleanFolder = folder ? `${folder}/` : '';
    return `${cleanFolder}${uuidv4()}.${ext}`;
  }

  private getUrl(publicId: string): string {
    return this.cdnUrl
      ? `${this.cdnUrl}/${publicId}`
      : this.endpoint
        ? `${this.endpoint}/${this.bucket}/${publicId}`
        : `https://${this.bucket}.s3.${this.config.s3.region}.amazonaws.com/${publicId}`;
  }

  async uploadFile(file: Express.Multer.File, folder: string = ''): Promise<StorageResponse> {
    const publicId = this.generatePublicId(folder, file.originalname);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    const metadata = await sharp(file.buffer).metadata();

    return {
      url: this.getUrl(publicId),
      publicId,
      width: metadata.width,
      height: metadata.height,
    };
  }

  async uploadFiles(files: Express.Multer.File[], folder: string): Promise<StorageResponse[]> {
    const uploads = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploads);
  }

  async deleteFiles(publicIds: string[]): Promise<unknown> {
    const objects = publicIds.map((id) => ({ Key: id }));
    return this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: objects },
      }),
    );
  }

  async getFileBuffer(publicId: string): Promise<Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
      }),
    );
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async uploadBuffer(buffer: Buffer, filename: string, folder: string): Promise<StorageResponse> {
    const publicId = `${folder}/${uuidv4()}-${filename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
        Body: buffer,
        ContentType: 'image/png',
        ACL: 'public-read',
      }),
    );

    return { url: this.getUrl(publicId), publicId };
  }
}