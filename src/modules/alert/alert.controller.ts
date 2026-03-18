import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AlertService } from './alert.service';
import { QueryAlertDto } from './dto/query-alert.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('alerts')
export class AlertController {
  constructor(private alertService: AlertService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: QueryAlertDto) {
    return this.alertService.findAll(query);
  }
}
