import { Module } from '@nestjs/common';
import { PhotographiesController } from './photographies.controller';
import { PhotographiesService } from './photographies.service';
import { ImageProcessorModule } from '../common/utils/image-processor.module';

@Module({
  imports: [ImageProcessorModule],
  controllers: [PhotographiesController],
  providers: [PhotographiesService],
})
export class PhotographiesModule {}
