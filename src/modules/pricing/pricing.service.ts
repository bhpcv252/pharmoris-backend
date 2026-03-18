import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePriceDto } from "./dto/create-price.dto";
import { AlertService } from "../alert/alert.service";
import { DashboardService } from "../dashboard/dashboard.service";
import { ReportService } from "../report/report.service";
import { logger } from "../../common/logger/logger";

@Injectable()
export class PricingService {
	constructor(
		private prisma: PrismaService,
		private alertService: AlertService,
		private dashboardService: DashboardService,
		private reportService: ReportService,
	) {}

	async create(dto: CreatePriceDto) {
		const medicine = await this.prisma.medicine.findUnique({
			where: { id: dto.medicine_id },
		});

		if (!medicine) {
			throw new NotFoundException("Medicine not found");
		}

		const previous = await this.prisma.priceObservation.findFirst({
			where: { medicineId: dto.medicine_id },
			orderBy: { observedAt: "desc" },
		});

		const observation = await this.prisma.priceObservation.create({
			data: {
				medicineId: dto.medicine_id,
				supplierId: dto.supplier_id,
				unitPrice: dto.unit_price,
			},
		});

		await this.dashboardService.invalidateCache();
		await this.reportService.invalidateCache();

		logger.info(
			{ medicineId: dto.medicine_id, price: dto.unit_price },
			"Price observation created",
		);

		// detect price spike
		if (previous) {
			const increase =
				(dto.unit_price - previous.unitPrice) / previous.unitPrice;

			if (increase > 0.1) {
				const severity = this.getSeverity(increase);

				await this.alertService.createPriceSpikeAlert({
					medicineId: dto.medicine_id,
					previousPrice: previous.unitPrice,
					currentPrice: dto.unit_price,
					increase,
					severity,
				});

				logger.warn(
					{
						medicineId: dto.medicine_id,
						increase: `${(increase * 100).toFixed(2)}%`,
					},
					"Price spike detected",
				);
			}
		}

		return observation;
	}

	private getSeverity(increase: number) {
		if (increase > 0.5) return "HIGH";
		if (increase > 0.25) return "MEDIUM";
		return "LOW";
	}
}
