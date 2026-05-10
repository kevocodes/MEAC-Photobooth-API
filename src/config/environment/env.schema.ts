import * as Joi from 'joi';

export default Joi.object({
  PORT: Joi.number().default(3000),
  RATE_LIMIT_DEFAULT_TTL: Joi.number().required(),
  RATE_LIMIT_DEFAULT_LIMIT: Joi.number().required(),
  STORAGE_PROVIDER: Joi.string().valid('cloudinary', 's3').default('cloudinary'),
  CLOUDINARY_NAME: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
  }),
  CLOUDINARY_API_KEY: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
  }),
  CLOUDINARY_API_SECRET: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
  }),
  CLOUDINARY_FOLDER: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 'cloudinary',
    then: Joi.required(),
  }),
  AWS_REGION: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
  }),
  AWS_ACCESS_KEY_ID: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
  }),
  AWS_S3_BUCKET_NAME: Joi.string().empty('').when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
  }),
  AWS_S3_CDN_URL: Joi.string().empty('').optional(),
  AWS_S3_ENDPOINT: Joi.string().empty('').optional(),
  AWS_S3_FORCE_PATH_STYLE: Joi.boolean().default(false),
  GOOGLE_FONTS_API_KEY: Joi.string().empty('').optional().default(''),
  DATABASE_URL: Joi.string().required(),
});
