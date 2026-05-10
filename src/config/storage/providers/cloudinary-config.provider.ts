import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import envConfig from '../../environment/env.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class CloudinaryConfigProvider implements OnModuleInit {
  constructor(
    @Inject(envConfig.KEY)
    private readonly config: ConfigType<typeof envConfig>,
  ) {}

  onModuleInit() {
    if (this.config.storage.provider === 'cloudinary') {
      cloudinary.config({
        cloud_name: this.config.cloudinary.name,
        api_key: this.config.cloudinary.apiKey,
        api_secret: this.config.cloudinary.apiSecret,
      });
    }
  }
}