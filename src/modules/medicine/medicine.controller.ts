import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('medicines')
export class MedicineController {
  constructor(private medicineService: MedicineService) {}

  // GET /medicines
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: QueryMedicineDto) {
    return this.medicineService.findAll(query);
  }

  // POST /medicines (Admin only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateMedicineDto) {
    return this.medicineService.create(dto);
  }
}
