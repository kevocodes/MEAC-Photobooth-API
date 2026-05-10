import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ApiResponse } from '../common/types/response.type';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { getParseImagePipe } from '../common/utils/get-parse-file-pipe';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  FindAllEventsDto,
  FramePositionDto,
} from './dtos/events.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() body: CreateEventDto): Promise<ApiResponse> {
    return await this.eventsService.create(body);
  }

  @Get()
  async getEvents(@Query() query: FindAllEventsDto): Promise<ApiResponse> {
    return await this.eventsService.getEvents(query);
  }

  @Get('active')
  async getActiveEvent(): Promise<ApiResponse> {
    return await this.eventsService.getActiveEvent();
  }

  @Get(':id')
  async getEvent(
    @Param('id', MongoIdPipe) id: string,
  ): Promise<ApiResponse> {
    return await this.eventsService.getEvent(id);
  }

  @Put(':id')
  async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() body: UpdateEventDto,
  ): Promise<ApiResponse> {
    return await this.eventsService.update(id, body);
  }

  @Post(':id/frame')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFrame(
    @Param('id', MongoIdPipe) id: string,
    @UploadedFile(getParseImagePipe()) image: Express.Multer.File,
  ): Promise<ApiResponse> {
    return await this.eventsService.uploadFrame(id, image);
  }

  @Put(':id/frame/position')
  async updateFramePosition(
    @Param('id', MongoIdPipe) id: string,
    @Body() body: FramePositionDto,
  ): Promise<ApiResponse> {
    return await this.eventsService.updateFramePosition(id, body);
  }

  @Delete(':id/frame')
  async deleteFrame(
    @Param('id', MongoIdPipe) id: string,
  ): Promise<ApiResponse> {
    return await this.eventsService.deleteFrame(id);
  }

  @Post(':id/activate')
  async setActive(
    @Param('id', MongoIdPipe) id: string,
  ): Promise<ApiResponse> {
    return await this.eventsService.setActive(id);
  }

  @Post(':id/sample')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSample(
    @Param('id', MongoIdPipe) id: string,
    @UploadedFile(getParseImagePipe()) image: Express.Multer.File,
  ): Promise<ApiResponse> {
    return await this.eventsService.uploadSample(id, image);
  }

  @Delete(':id/sample')
  async deleteSample(
    @Param('id', MongoIdPipe) id: string,
  ): Promise<ApiResponse> {
    return await this.eventsService.deleteSample(id);
  }

  @Delete(':id')
  async delete(
    @Param('id', MongoIdPipe) id: string,
  ): Promise<ApiResponse> {
    return await this.eventsService.delete(id);
  }
}