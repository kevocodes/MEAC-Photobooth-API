import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateRandomAlphanumericCode } from '../common/utils/code-generator';
import { CloudinaryService } from '../config/cloudinary/cloudinary.service';
import { PrismaService } from '../config/prisma/prisma.service';
import { BANNED_WORDS } from '../common/constants/bannedWords';
import {
  ConfirmPrintedItemDto,
  FindAllPhotographiesDto,
} from './dtos/photographies.dto';

@Injectable()
export class PhotographiesService {
  constructor(
    public readonly prismaService: PrismaService,
    public readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadPhotography(image: Express.Multer.File) {
    try {
      const uploadedImage = await this.cloudinaryService.uploadFile(image);

      // Generar códigos únicos para todas las imágenes
      const codes = new Set<string>();
      const existingCodes = new Set(
        (
          await this.prismaService.photography.findMany({
            select: { code: true },
          })
        ).map((photo) => photo.code),
      );

      const generateUniqueCode = () => {
        let code;
        do {
          code = generateRandomAlphanumericCode(3);
        } while (
          codes.has(code) ||
          existingCodes.has(code) ||
          BANNED_WORDS.includes(code)
        );
        codes.add(code);
        return code;
      };
      const photography = await this.prismaService.photography.create({
        data: {
          url: uploadedImage.secure_url,
          public_id: uploadedImage.public_id,
          width: uploadedImage.width,
          height: uploadedImage.height,
          code: generateUniqueCode(),
          printedAt: null,
          printedQuantity: 0,
        },
      });

      return {
        data: photography,
        message: 'Photography uploaded successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async uploadPhotographies(images: Express.Multer.File[]) {
    try {
      // Subir todas las imágenes a Cloudinary en paralelo
      const uploadedImages = await Promise.all(
        images.map((image) => this.cloudinaryService.uploadFile(image)),
      );

      // Generar códigos únicos para todas las imágenes
      const codes = new Set<string>();
      const existingCodes = new Set(
        (
          await this.prismaService.photography.findMany({
            select: { code: true },
          })
        ).map((photo) => photo.code),
      );

      const generateUniqueCode = () => {
        let code;
        do {
          code = generateRandomAlphanumericCode(3);
        } while (
          codes.has(code) ||
          existingCodes.has(code) ||
          BANNED_WORDS.includes(code)
        );
        codes.add(code);
        return code;
      };

      // Crear objetos de datos para insertar en la base de datos
      const photographiesData = uploadedImages.map((uploadedImage) => ({
        url: uploadedImage.secure_url,
        public_id: uploadedImage.public_id,
        width: uploadedImage.width,
        height: uploadedImage.height,
        code: generateUniqueCode(),
        printedAt: null,
        printedQuantity: 0,
      }));

      // Insertar en la base de datos en batch
      await this.prismaService.photography.createMany({
        data: photographiesData,
      });

      return {
        data: photographiesData, // Devolver los datos insertados
        message: 'Photographies uploaded successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getPhotographies(query: FindAllPhotographiesDto) {
    const { order = 'asc', printed } = query;

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

  async delete(id: string) {
    const photography = await this.prismaService.photography.findUnique({
      where: {
        id,
      },
    });

    if (!photography) throw new NotFoundException('Photography not found');

    await Promise.all([
      this.cloudinaryService.deleteFiles([photography.public_id]),
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
          return this.cloudinaryService.deleteFiles(
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
      throw new NotFoundException('Photographies not found');

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
          return this.cloudinaryService.deleteFiles(
            photographies.slice(start, end).map((photo) => photo.public_id),
          );
        }),
    ]);

    return {
      message: 'Photographies deleted successfully',
      data: null,
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
