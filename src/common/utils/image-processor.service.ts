import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

export interface ComposeOptions {
  photoBuffer: Buffer;
  frameBuffer: Buffer;
  photoX: number;
  photoY: number;
  photoWidth: number;
  photoHeight: number;
}

export interface ComposeWithCodeOptions extends ComposeOptions {
  code: string;
  codeShow: boolean;
  codeX: number;
  codeY: number;
  codeColor: string;
  codeFontSize: number;
  codeFontFamily: string;
  codeFontWeight: string;
  baseWidth: number;
}

@Injectable()
export class ImageProcessorService {
  async composeFrameWithPhoto(options: ComposeOptions): Promise<Buffer> {
    const { photoBuffer, frameBuffer, photoX, photoY, photoWidth, photoHeight } = options;

    const frameMeta = await sharp(frameBuffer).metadata();

    if (!frameMeta.width || !frameMeta.height) {
      throw new Error('Invalid frame image');
    }

    const resizedPhoto = await sharp(photoBuffer)
      .resize(photoWidth, photoHeight, { fit: 'cover' })
      .toBuffer();

    const compositeBuffer = await sharp({
      create: {
        width: frameMeta.width,
        height: frameMeta.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resizedPhoto,
          left: photoX,
          top: photoY,
        },
        {
          input: frameBuffer,
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    return compositeBuffer;
  }

  async composeForPrint(options: ComposeWithCodeOptions): Promise<Buffer> {
    const { photoBuffer, frameBuffer, photoX, photoY, photoWidth, photoHeight, code, codeShow, codeX, codeY, codeColor, codeFontSize, codeFontFamily, codeFontWeight, baseWidth } = options;

    const frameMeta = await sharp(frameBuffer).metadata();

    if (!frameMeta.width || !frameMeta.height) {
      throw new Error('Invalid frame image');
    }

    // Scale from editor coordinates to real frame pixels
    const scale = frameMeta.width / baseWidth;

    const scaledPhotoX = Math.round(photoX * scale);
    const scaledPhotoY = Math.round(photoY * scale);
    const scaledPhotoW = Math.round(photoWidth * scale);
    const scaledPhotoH = Math.round(photoHeight * scale);
    const scaledCodeX = Math.round((codeX || 0) * scale);
    const scaledCodeY = Math.round((codeY || 0) * scale);
    const scaledCodeFontSize = Math.round(codeFontSize * scale);

    const resizedPhoto = await sharp(photoBuffer)
      .resize(scaledPhotoW, scaledPhotoH, { fit: 'cover' })
      .toBuffer();

    const layers: any[] = [
      {
        input: resizedPhoto,
        left: scaledPhotoX,
        top: scaledPhotoY,
      },
      {
        input: frameBuffer,
        left: 0,
        top: 0,
      },
    ];

    // Add code text as SVG overlay
    if (codeShow && code) {
      const weight = codeFontWeight === 'bold' || codeFontWeight === '700' ? 'bold' : 'normal';
      const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${frameMeta.width}" height="${frameMeta.height}">
        <text x="${scaledCodeX}" y="${scaledCodeY}" dominant-baseline="text-before-edge" font-size="${scaledCodeFontSize}" font-family="${codeFontFamily}, sans-serif" font-weight="${weight}" fill="${codeColor}">${code}</text>
      </svg>`;

      layers.push({
        input: Buffer.from(svgText),
        left: 0,
        top: 0,
      });
    }

    const compositeBuffer = await sharp({
      create: {
        width: frameMeta.width,
        height: frameMeta.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 255 },
      },
    })
      .composite(layers)
      .png()
      .toBuffer();

    return compositeBuffer;
  }
}