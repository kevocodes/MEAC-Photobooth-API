import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  rateLimit: {
    default: {
      ttl: parseInt(process.env.RATE_LIMIT_DEFAULT_TTL, 10),
      limit: parseInt(process.env.RATE_LIMIT_DEFAULT_LIMIT, 10),
    },
  },
  port: parseInt(process.env.PORT, 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'cloudinary',
  },
  cloudinary: {
    name: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER,
  },
  s3: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    cdnUrl: process.env.AWS_S3_CDN_URL || null,
    endpoint: process.env.AWS_S3_ENDPOINT || null,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  },
  googleFonts: {
    apiKey: process.env.GOOGLE_FONTS_API_KEY || '',
  },
}));
