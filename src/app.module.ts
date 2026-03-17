import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EnvConfig } from './env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config: Record<string, unknown>) => {
        const validatedConfig = plainToInstance(EnvConfig, config, {
          enableImplicitConversion: true,
        });

        const errors = validateSync(validatedConfig, { whitelist: true });
        if (errors.length > 0) {
          throw new Error(
            `Environment validation failed: ${errors
              .map((e) => Object.values(e.constraints || {}).join(', '))
              .join('; ')}`,
          );
        }
        return validatedConfig;
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
