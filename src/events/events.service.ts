import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from '../config/storage/storage.service';
import { PrismaService } from '../config/prisma/prisma.service';
import {
  CreateEventDto,
  UpdateEventDto,
  FindAllEventsDto,
  FramePositionDto,
} from './dtos/events.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Generates a semantic folder path for an event's assets.
   */
  private getEventFolder(event: { name: string; year: number }, subfolder: string): string {
    const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `events/${slug}-${event.year}/${subfolder}`;
  }

  async create(data: CreateEventDto) {
    try {
      const event = await this.prismaService.event.create({
        data: {
          name: data.name,
          year: data.year,
          isActive: false,
          photoX: 0,
          photoY: 0,
          photoWidth: 400,
          photoHeight: 600,
        },
      });

      return {
        data: event,
        message: 'Event created successfully',
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Event with this name and year already exists');
      }
      throw error;
    }
  }

  async getEvents(query: FindAllEventsDto) {
    const { order = 'desc', active } = query;

    const events = await this.prismaService.event.findMany({
      where: {
        ...(active !== undefined ? { isActive: active } : {}),
      },
      orderBy: {
        createdAt: order,
      },
      include: {
        _count: {
          select: { photographs: true },
        },
      },
    });

    return {
      data: events,
      message: 'Events retrieved successfully',
    };
  }

  async getEvent(id: string) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
      include: {
        photographs: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { photographs: true },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    return {
      data: event,
      message: 'Event retrieved successfully',
    };
  }

  async getActiveEvent() {
    const event = await this.prismaService.event.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { photographs: true },
        },
      },
    });

    if (!event) throw new NotFoundException('No active event found');

    return {
      data: event,
      message: 'Active event retrieved successfully',
    };
  }

  async update(id: string, data: UpdateEventDto) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    try {
      const updated = await this.prismaService.event.update({
        where: { id },
        data,
      });

      return {
        data: updated,
        message: 'Event updated successfully',
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Event with this name and year already exists');
      }
      throw error;
    }
  }

  async uploadFrame(id: string, image: Express.Multer.File) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (event.framePublicId) {
      await this.storageService.deleteFiles([event.framePublicId]);
    }

    const folder = this.getEventFolder(event, 'frames');
    const uploadedImage = await this.storageService.uploadFile(image, folder);

    const updated = await this.prismaService.event.update({
      where: { id },
      data: {
        frameUrl: uploadedImage.url,
        framePublicId: uploadedImage.publicId,
        frameWidth: uploadedImage.width,
        frameHeight: uploadedImage.height,
      },
    });

    return {
      data: updated,
      message: 'Frame uploaded successfully',
    };
  }

  async updateFramePosition(id: string, data: FramePositionDto) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    const updated = await this.prismaService.event.update({
      where: { id },
      data: {
        photoX: data.photoX,
        photoY: data.photoY,
        photoWidth: data.photoWidth,
        photoHeight: data.photoHeight,
      },
    });

    return {
      data: updated,
      message: 'Frame position updated successfully',
    };
  }

  async deleteFrame(id: string) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (!event.framePublicId) {
      throw new BadRequestException('Event has no frame to delete');
    }

    await this.storageService.deleteFiles([event.framePublicId]);

    const updated = await this.prismaService.event.update({
      where: { id },
      data: {
        frameUrl: null,
        framePublicId: null,
        frameWidth: null,
        frameHeight: null,
      },
    });

    return {
      data: updated,
      message: 'Frame deleted successfully',
    };
  }

  async delete(id: string) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
      include: {
        photographs: true,
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    // Collect all storage public IDs to delete
    const publicIdsToDelete: string[] = [];
    if (event.framePublicId) publicIdsToDelete.push(event.framePublicId);
    if (event.samplePublicId) publicIdsToDelete.push(event.samplePublicId);
    event.photographs.forEach((photo) => publicIdsToDelete.push(photo.public_id));

    // Delete from storage in batches of 100
    if (publicIdsToDelete.length > 0) {
      const batches = Math.ceil(publicIdsToDelete.length / 100);
      await Promise.all(
        Array.from({ length: batches }, (_, i) => {
          const batch = publicIdsToDelete.slice(i * 100, (i + 1) * 100);
          return this.storageService.deleteFiles(batch);
        }),
      );
    }

    await this.prismaService.event.delete({
      where: { id },
    });

    return {
      message: 'Event deleted successfully',
      data: null,
    };
  }

  async setActive(id: string) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    await this.prismaService.$transaction([
      this.prismaService.event.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prismaService.event.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return {
      data: { id, isActive: true },
      message: 'Event set as active successfully',
    };
  }

  async uploadSample(id: string, image: Express.Multer.File) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (event.samplePublicId) {
      await this.storageService.deleteFiles([event.samplePublicId]);
    }

    const folder = this.getEventFolder(event, 'samples');
    const uploadedImage = await this.storageService.uploadFile(image, folder);

    const updated = await this.prismaService.event.update({
      where: { id },
      data: {
        sampleUrl: uploadedImage.url,
        samplePublicId: uploadedImage.publicId,
      },
    });

    return {
      data: updated,
      message: 'Sample image uploaded successfully',
    };
  }

  async deleteSample(id: string) {
    const event = await this.prismaService.event.findUnique({
      where: { id },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (!event.samplePublicId) {
      throw new BadRequestException('Event has no sample image to delete');
    }

    await this.storageService.deleteFiles([event.samplePublicId]);

    const updated = await this.prismaService.event.update({
      where: { id },
      data: {
        sampleUrl: null,
        samplePublicId: null,
      },
    });

    return {
      data: updated,
      message: 'Sample image deleted successfully',
    };
  }
}