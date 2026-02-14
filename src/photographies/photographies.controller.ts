import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { PhotographiesService } from './photographies.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ApiResponse } from '../common/types/response.type';
import { getParseImagePipe } from '../common/utils/get-parse-file-pipe';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import {
  ConfirmPrintedPhotographiesDto,
  DeletePhotographiesByIdsDTO,
  FindAllPhotographiesDto,
} from './dtos/photographies.dto';

@Controller('photographies')
export class PhotographiesController {
  constructor(private readonly photographiesService: PhotographiesService) {}

  @Post('upload')
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
  async uploadPhotography(
    @UploadedFile(getParseImagePipe())
    image: Express.Multer.File,
  ): Promise<ApiResponse> {
    return await this.photographiesService.uploadPhotography(image);
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadPhotographies(
    @UploadedFiles(getParseImagePipe())
    images: Express.Multer.File[],
  ): Promise<ApiResponse> {
    return await this.photographiesService.uploadPhotographies(images);
  }

  @ApiQuery({ name: 'order', required: false, type: 'string', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'printed', required: false, type: 'boolean' })
  @Get()
  async getPhotographies(
    @Query() query: FindAllPhotographiesDto,
  ): Promise<ApiResponse> {
    return await this.photographiesService.getPhotographies(query);
  }

  @Get(':id')
  async getPhotography(
    @Param('id', MongoIdPipe) id: string,
  ): Promise<ApiResponse> {
    return await this.photographiesService.getPhotography(id);
  }

  @Get('code/:code')
  async getPhotographyByCode(
    @Param('code') code: string,
  ): Promise<ApiResponse> {
    return await this.photographiesService.getPhotographyByCode(code);
  }

  @Delete('/all')
  async deleteAll(): Promise<ApiResponse> {
    return await this.photographiesService.deleteAll();
  }

  @Delete('/delete-multiple')
  async deleteMultiple(
    @Body() body: DeletePhotographiesByIdsDTO,
  ): Promise<ApiResponse> {
    return await this.photographiesService.deleteByIds(body.ids);
  }

  @Post('/confirm-printed')
  async confirmPrinted(
    @Body() body: ConfirmPrintedPhotographiesDto,
  ): Promise<ApiResponse> {
    return await this.photographiesService.confirmPrinted(body.items);
  }

  @Delete(':id')
  async delete(@Param('id', MongoIdPipe) id: string): Promise<ApiResponse> {
    return await this.photographiesService.delete(id);
  }
}
