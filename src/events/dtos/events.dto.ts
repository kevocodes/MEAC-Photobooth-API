import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'MEAC' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2025 })
  @IsNumber()
  @Min(2000)
  year: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'MEAC' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsNumber()
  @Min(2000)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  photoX?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  photoY?: number;

  @ApiPropertyOptional({ example: 400 })
  @IsNumber()
  @IsOptional()
  photoWidth?: number;

  @ApiPropertyOptional({ example: 600 })
  @IsNumber()
  @IsOptional()
  photoHeight?: number;

  @ApiPropertyOptional({ example: 486 })
  @IsNumber()
  @IsOptional()
  baseWidth?: number;

  @ApiPropertyOptional({ example: 673 })
  @IsNumber()
  @IsOptional()
  baseHeight?: number;

  @ApiPropertyOptional({ enum: ['landscape', 'portrait'] })
  @IsString()
  @IsOptional()
  printOrientation?: string;

  @ApiPropertyOptional({ enum: ['LETTER', 'A4', 'LEGAL'] })
  @IsString()
  @IsOptional()
  printPageSize?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  printColumns?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  printRows?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  codeShow?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  codeX?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  codeY?: number;

  @ApiPropertyOptional({ example: '#333333' })
  @IsString()
  @IsOptional()
  codeColor?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  codeFontSize?: number;

  @ApiPropertyOptional({ example: 'Oswald' })
  @IsString()
  @IsOptional()
  codeFontFamily?: string;

  @ApiPropertyOptional({ example: 'bold' })
  @IsString()
  @IsOptional()
  codeFontWeight?: string;
}

export class FramePositionDto {
  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  photoX?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  photoY?: number;

  @ApiPropertyOptional({ example: 400 })
  @IsNumber()
  @IsOptional()
  photoWidth?: number;

  @ApiPropertyOptional({ example: 600 })
  @IsNumber()
  @IsOptional()
  photoHeight?: number;
}

export class FindAllEventsDto {
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum({ asc: 'asc', desc: 'desc' })
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;
}
