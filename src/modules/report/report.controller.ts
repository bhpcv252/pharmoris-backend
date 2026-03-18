import { Controller, Get, UseGuards } from "@nestjs/common";
import { ReportService } from "./report.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("reports")
export class ReportController {
	constructor(private reportService: ReportService) {}

	@UseGuards(JwtAuthGuard)
	@Get("cost-savings")
	async getCostSavings() {
		return this.reportService.getCostSavings();
	}
}
