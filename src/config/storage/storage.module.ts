import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { CloudinaryProvider } from './providers/cloudinary-provider';
import { CloudinaryConfigProvider } from './providers/cloudinary-config.provider';
import { S3Provider } from './providers/s3-provider';

@Global()
@Module({
  providers: [StorageService, CloudinaryProvider, CloudinaryConfigProvider, S3Provider],
  exports: [StorageService],
})
export class StorageModule {}