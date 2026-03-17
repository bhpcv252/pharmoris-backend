import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: string;
  timestamp: string;
};

@Controller()
export class HealthController {
  @Get('/health')
  health(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
