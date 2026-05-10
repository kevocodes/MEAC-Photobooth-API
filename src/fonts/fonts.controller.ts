import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import envConfig from '../config/environment/env.config';

@Controller('fonts')
export class FontsController {
  constructor(
    @Inject(envConfig.KEY)
    private readonly config: ConfigType<typeof envConfig>,
  ) {}

  @Get('search')
  async search(@Query('q') query: string) {
    const apiKey = this.config.googleFonts.apiKey;

    if (!apiKey) {
      return { data: [], message: 'Google Fonts API key not configured' };
    }

    if (!query || query.length < 2) {
      return { data: [], message: 'Query too short' };
    }

    const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`;

    const response = await fetch(url);
    if (!response.ok) {
      return { data: [], message: 'Error fetching fonts' };
    }

    const { items } = await response.json();

    // Filter by query
    const q = query.toLowerCase();
    const filtered = items
      .filter((font: any) => font.family.toLowerCase().includes(q))
      .slice(0, 20)
      .map((font: any) => ({
        family: font.family,
        variants: font.variants,
        category: font.category,
      }));

    return { data: filtered, message: 'Fonts retrieved successfully' };
  }
}
