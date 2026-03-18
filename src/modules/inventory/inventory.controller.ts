import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('inventory-snapshots')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.create(dto);
  }
}
