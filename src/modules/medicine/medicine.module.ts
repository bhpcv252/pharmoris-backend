import { Module } from "@nestjs/common";
import { MedicineService } from "./medicine.service";
import { MedicineController } from "./medicine.controller";
import { DashboardModule } from "../dashboard/dashboard.module";
import { ReportModule } from "../report/report.module";

@Module({
	imports: [DashboardModule, ReportModule],
	controllers: [MedicineController],
	providers: [MedicineService],
})
export class MedicineModule {}
