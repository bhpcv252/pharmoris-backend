import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PricingController } from "./pricing.controller";
import { AlertModule } from "../alert/alert.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { ReportModule } from "../report/report.module";

@Module({
	imports: [AlertModule, DashboardModule, ReportModule],
	controllers: [PricingController],
	providers: [PricingService],
})
export class PricingModule {}
