import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { AlertService } from "../alert/alert.service";
import { DashboardService } from "../dashboard/dashboard.service";
import { logger } from "../../common/logger/logger";

@Injectable()
export class InventoryService {
	constructor(
		private prisma: PrismaService,
		private alertService: AlertService,
		private dashboardService: DashboardService,
	) {}

	async create(dto: CreateInventoryDto) {
		const medicine = await this.prisma.medicine.findUnique({
			where: { id: dto.medicine_id },
		});

		if (!medicine) {
			throw new NotFoundException("Medicine not found");
		}

		const snapshot = await this.prisma.inventorySnapshot.create({
			data: {
				pharmacyId: dto.pharmacy_id,
				medicineId: dto.medicine_id,
				quantityOnHand: dto.quantity_on_hand,
			},
		});

		await this.dashboardService.invalidateCache();

		logger.info(
			{ medicineId: dto.medicine_id, qty: dto.quantity_on_hand },
			"Inventory snapshot created",
		);

		// detect low stock
		if (dto.quantity_on_hand < medicine.reorderThreshold) {
			const severity = this.getSeverity(
				dto.quantity_on_hand,
				medicine.reorderThreshold,
			);

			await this.alertService.createLowStockAlert({
				medicineId: medicine.id,
				pharmacyId: dto.pharmacy_id,
				quantity: dto.quantity_on_hand,
				threshold: medicine.reorderThreshold,
				severity,
			});

			logger.warn({ medicineId: medicine.id }, "Low stock alert triggered");
		}

		return snapshot;
	}

	private getSeverity(quantity: number, threshold: number) {
		const ratio = quantity / threshold;

		if (ratio < 0.25) return "HIGH";
		if (ratio < 0.5) return "MEDIUM";
		return "LOW";
	}
}
