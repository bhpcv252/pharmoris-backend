import { Controller, Get, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("dashboard")
export class DashboardController {
	constructor(private dashboardService: DashboardService) {}

	@UseGuards(JwtAuthGuard)
	@Get("summary")
	async getSummary() {
		return this.dashboardService.getSummary();
	}
}
