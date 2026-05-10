import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import envConfig from './config/environment/env.config';
import { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { StorageModule } from './config/storage/storage.module';
import { PhotographiesModule } from './photographies/photographies.module';
import { EventsModule } from './events/events.module';
import { FontsModule } from './fonts/fonts.module';
@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [envConfig.KEY],
      useFactory: (configService: ConfigType<typeof envConfig>) => [
        {
          limit: configService.rateLimit.default.limit,
          ttl: seconds(configService.rateLimit.default.ttl),
        },
      ],
    }),
    StorageModule,
    PhotographiesModule,
    EventsModule,
    FontsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
