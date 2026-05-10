import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class FindAllPhotographiesDto {
  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum({ asc: 'asc', desc: 'desc' })
  order?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  printed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  eventId?: string;
}

export class DeletePhotographiesByIdsDTO {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class ConfirmPrintedItemDto {
  @IsMongoId()
  id: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ConfirmPrintedPhotographiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmPrintedItemDto)
  items: ConfirmPrintedItemDto[];
}
