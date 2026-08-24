import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth(): object {
    return {
      service: 'order-service',
      status: 'healthy',
      version: '2.1.0-preview',
      message: 'Infisical dual-mode entrypoint active',
      timestamp: new Date().toISOString(),
    };
  }
}
