import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EnvConfig } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './modules/health/health.controller';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { MedicineModule } from './modules/medicine/medicine.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AlertModule } from './modules/alert/alert.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportModule } from './modules/report/report.module';

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
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    HealthModule,
    AuthModule,
    MedicineModule,
    InventoryModule,
    PricingModule,
    AlertModule,
    DashboardModule,
    ReportModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
