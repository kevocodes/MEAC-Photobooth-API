import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateRandomAlphanumericCode } from '../common/utils/code-generator';
import { StorageService } from '../config/storage/storage.service';
import { PrismaService } from '../config/prisma/prisma.service';
import { BANNED_WORDS } from '../common/constants/bannedWords';
import { ImageProcessorService } from '../common/utils/image-processor.service';
import {
  ConfirmPrintedItemDto,
  FindAllPhotographiesDto,
} from './dtos/photographies.dto';

@Injectable()
export class PhotographiesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  /**
   * Gets the currently active event. Throws if none is active.
   */
  private async getActiveEvent() {
    const event = await this.prismaService.event.findFirst({
      where: { isActive: true },
    });
    if (!event) {
      throw new BadRequestException('No active event. Please activate an event first.');
    }
    return event;
  }

  /**
   * Generates a semantic folder path for an event's assets.
   */
  private getEventFolder(event: { name: string; year: number }, subfolder: string): string {
    const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `events/${slug}-${event.year}/${subfolder}`;
  }

  async uploadPhotography(image: Express.Multer.File) {
    const event = await this.getActiveEvent();
    const folder = this.getEventFolder(event, 'photos');

    const uploadedImage = await this.storageService.uploadFile(image, folder);

    const code = await this.generateUniqueCode();

    const photography = await this.prismaService.photography.create({
      data: {
        url: uploadedImage.url,
        public_id: uploadedImage.publicId,
        width: uploadedImage.width,
        height: uploadedImage.height,
        code,
        printedAt: null,
        printedQuantity: 0,
        eventId: event.id,
      },
    });

    return {
      data: photography,
      message: 'Photography uploaded successfully',
    };
  }

  async uploadPhotographies(images: Express.Multer.File[]) {
    const event = await this.getActiveEvent();
    const folder = this.getEventFolder(event, 'photos');

    const uploadedImages = await Promise.all(
      images.map((image) => this.storageService.uploadFile(image, folder)),
    );

    const codes = await this.generateUniqueCodes(images.length);

    const photographiesData = uploadedImages.map((uploadedImage, i) => ({
      url: uploadedImage.url,
      public_id: uploadedImage.publicId,
      width: uploadedImage.width,
      height: uploadedImage.height,
      code: codes[i],
      printedAt: null,
      printedQuantity: 0,
      eventId: event.id,
    }));

    await this.prismaService.photography.createMany({
      data: photographiesData,
    });

    return {
      data: photographiesData,
      message: 'Photographies uploaded successfully',
    };
  }

  private async generateUniqueCode(): Promise<string> {
    const existingCodes = new Set(
      (await this.prismaService.photography.findMany({ select: { code: true } }))
        .map((p) => p.code),
    );

    let code: string;
    do {
      code = generateRandomAlphanumericCode(3);
    } while (existingCodes.has(code) || BANNED_WORDS.includes(code));

    return code;
  }

  private async generateUniqueCodes(count: number): Promise<string[]> {
    const existingCodes = new Set(
      (await this.prismaService.photography.findMany({ select: { code: true } }))
        .map((p) => p.code),
    );

    const codes: string[] = [];
    const usedCodes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let code: string;
      do {
        code = generateRandomAlphanumericCode(3);
      } while (existingCodes.has(code) || usedCodes.has(code) || BANNED_WORDS.includes(code));
      usedCodes.add(code);
      codes.push(code);
    }

    return codes;
  }

  async getPhotographies(query: FindAllPhotographiesDto) {
    const { order = 'asc', printed, eventId } = query;

    // If no eventId specified, use the active event
    let resolvedEventId = eventId;
    if (!resolvedEventId) {
      const activeEvent = await this.prismaService.event.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (activeEvent) {
        resolvedEventId = activeEvent.id;
      }
    }

    const photographies = await this.prismaService.photography.findMany({
      where: {
        ...(printed === undefined
          ? {}
          : printed
            ? { printedAt: { not: null } }
            : {
                OR: [
                  { printedAt: null },
                  { printedAt: { isSet: false } },
                ],
              }),
        ...(resolvedEventId ? { eventId: resolvedEventId } : {}),
      },
      orderBy: {
        createdAt: order,
      },
    });

    return {
      data: photographies,
      message: 'Photographies retrieved successfully',
    };
  }

  async getPhotography(id: string) {
    const photography = await this.prismaService.photography.findUnique({
      where: {
        id,
      },
    });

    if (!photography) throw new NotFoundException('Photography not found');

    return {
      data: photography,
      message: 'Photography retrieved successfully',
    };
  }

  async getPhotographyByCode(code: string) {
    const photography = await this.prismaService.photography.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
    });

    if (!photography) throw new NotFoundException('Photography not found');

    return {
      data: photography,
      message: 'Photography retrieved successfully',
    };
  }

  async getCompositeImage(id: string) {
    const photography = await this.prismaService.photography.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!photography) throw new NotFoundException('Photography not found');

    if (!photography.event || !photography.event.framePublicId) {
      throw new BadRequestException(
        'Photography has no associated event or the event has no frame configured',
      );
    }

    const event = photography.event;

    const [photoBuffer, frameBuffer] = await Promise.all([
      this.storageService.getFileBuffer(photography.public_id),
      this.storageService.getFileBuffer(event.framePublicId),
    ]);

    const compositeBuffer = await this.imageProcessorService.composeFrameWithPhoto({
      photoBuffer,
      frameBuffer,
      photoX: event.photoX,
      photoY: event.photoY,
      photoWidth: event.photoWidth,
      photoHeight: event.photoHeight,
    });

    const compositeUpload = await this.storageService.uploadBuffer(
      compositeBuffer,
      `composite-${photography.code}.png`,
      this.getEventFolder(event, 'composites'),
    );

    return {
      data: {
        originalUrl: photography.url,
        compositeUrl: compositeUpload.url,
        compositePublicId: compositeUpload.publicId,
        frameConfig: {
          photoX: event.photoX,
          photoY: event.photoY,
          photoWidth: event.photoWidth,
          photoHeight: event.photoHeight,
        },
      },
      message: 'Composite image generated successfully',
    };
  }

  async delete(id: string) {
    const photography = await this.prismaService.photography.findUnique({
      where: {
        id,
      },
    });

    if (!photography) throw new NotFoundException('Photography not found');

    await Promise.all([
      this.storageService.deleteFiles([photography.public_id]),
      this.prismaService.photography.delete({
        where: {
          id,
        },
      }),
    ]);

    return {
      message: 'Photography deleted successfully',
      data: null,
    };
  }

  async deleteAll() {
    const photographies = await this.prismaService.photography.findMany();
    const requests = Math.ceil(photographies.length / 100);

    await Promise.all([
      this.prismaService.photography.deleteMany(),
      ...Array(requests)
        .fill(0)
        .map((_, index) => {
          const start = index * 100;
          const end = start + 100;
          return this.storageService.deleteFiles(
            photographies.slice(start, end).map((photo) => photo.public_id),
          );
        }),
    ]);

    return {
      message: 'Photographies deleted successfully',
      data: null,
    };
  }

  async deleteByIds(ids: string[]) {
    const photographies = await this.prismaService.photography.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (photographies.length === 0)
      throw new NotFoundException('Photographies were not found');

    const requests = Math.ceil(photographies.length / 100);

    await Promise.all([
      this.prismaService.photography.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      }),
      ...Array(requests)
        .fill(0)
        .map((_, index) => {
          const start = index * 100;
          const end = start + 100;
          return this.storageService.deleteFiles(
            photographies.slice(start, end).map((photo) => photo.public_id),
          );
        }),
    ]);

    return {
      message: 'Photographies deleted successfully',
      data: null,
    };
  }

  async generateComposites(ids: string[], baseWidth: number) {
    if (!ids.length) {
      throw new BadRequestException('At least one photography ID is required');
    }

    const event = await this.getActiveEvent();

    if (!event.framePublicId) {
      throw new BadRequestException('Active event has no frame configured');
    }

    const photographies = await this.prismaService.photography.findMany({
      where: { id: { in: ids } },
    });

    if (photographies.length === 0) {
      throw new NotFoundException('No photographies found');
    }

    const frameBuffer = await this.storageService.getFileBuffer(event.framePublicId);

    const composites = await Promise.all(
      photographies.map(async (photo) => {
        const photoBuffer = await this.storageService.getFileBuffer(photo.public_id);

        const compositeBuffer = await this.imageProcessorService.composeForPrint({
          photoBuffer,
          frameBuffer,
          photoX: event.photoX,
          photoY: event.photoY,
          photoWidth: event.photoWidth,
          photoHeight: event.photoHeight,
          code: photo.code,
          codeShow: event.codeShow ?? true,
          codeX: event.codeX ?? 10,
          codeY: event.codeY ?? 10,
          codeColor: event.codeColor ?? '#333333',
          codeFontSize: event.codeFontSize ?? 10,
          codeFontFamily: event.codeFontFamily ?? 'Oswald',
          codeFontWeight: event.codeFontWeight ?? 'bold',
          baseWidth,
        });

        const folder = this.getEventFolder(event, 'composites');
        const uploaded = await this.storageService.uploadBuffer(
          compositeBuffer,
          `print-${photo.code}.png`,
          folder,
        );

        return {
          id: photo.id,
          code: photo.code,
          compositeUrl: uploaded.url,
        };
      }),
    );

    return {
      data: composites,
      message: 'Composites generated successfully',
    };
  }

  async confirmPrinted(items: ConfirmPrintedItemDto[]) {
    if (!items.length) {
      throw new BadRequestException('At least one photography is required');
    }

    const quantityById = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + item.quantity;
      return acc;
    }, {});
    const uniqueIds = Object.keys(quantityById);
    const photographies = await this.prismaService.photography.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
      select: {
        id: true,
        printedQuantity: true,
      },
    });

    if (photographies.length !== uniqueIds.length) {
      throw new NotFoundException('One or more photographies were not found');
    }

    const now = new Date();
    await this.prismaService.$transaction(
      photographies.map((photo) =>
        this.prismaService.photography.update({
          where: { id: photo.id },
          data: {
            printedAt: now,
            printedQuantity: (photo.printedQuantity || 0) + quantityById[photo.id],
          },
        }),
      ),
    );

    return {
      data: null,
      message: 'Photographies marked as printed successfully',
    };
  }
}