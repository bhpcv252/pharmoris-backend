import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('price-observations')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreatePriceDto) {
    return this.pricingService.create(dto);
  }
}
