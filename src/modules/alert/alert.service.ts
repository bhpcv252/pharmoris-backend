import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryAlertDto } from "./dto/query-alert.dto";
import { DashboardService } from "../dashboard/dashboard.service";
import { Prisma, AlertSeverity } from "@prisma/client";

@Injectable()
export class AlertService {
	constructor(
		private prisma: PrismaService,
		private dashboardService: DashboardService,
	) {}

	async findAll(query: QueryAlertDto) {
		const where: Prisma.AlertWhereInput = {};

		if (query.status) {
			where.status = query.status;
		}

		if (query.severity) {
			where.severity = query.severity;
		}

		return this.prisma.alert.findMany({
			where,
			orderBy: { createdAt: "desc" },
		});
	}

	async createLowStockAlert(data: {
		medicineId: string;
		pharmacyId: string;
		quantity: number;
		threshold: number;
		severity: AlertSeverity;
	}) {
		const alert = await this.prisma.alert.create({
			data: {
				medicineId: data.medicineId,
				pharmacyId: data.pharmacyId,
				alertType: "LOW_STOCK",
				severity: data.severity,
				message: `Low stock: ${data.quantity} remaining (threshold ${data.threshold})`,
				status: "OPEN",
			},
		});

		await this.dashboardService.invalidateCache();

		return alert;
	}

	async createPriceSpikeAlert(data: {
		medicineId: string;
		previousPrice: number;
		currentPrice: number;
		increase: number;
		severity: AlertSeverity;
	}) {
		const alert = await this.prisma.alert.create({
			data: {
				medicineId: data.medicineId,
				alertType: "PRICE_SPIKE",
				severity: data.severity,
				message: `Price increased from ${data.previousPrice} to ${
					data.currentPrice
				} (${(data.increase * 100).toFixed(2)}%)`,
				status: "OPEN",
			},
		});

		await this.dashboardService.invalidateCache();

		return alert;
	}
}
