import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  redirectToHealth(@Res() res: Response) {
    res.redirect(301, '/health');
  }
}
