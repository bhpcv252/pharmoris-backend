import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { calculateSavingsForMedicine } from "../../common/analytics/savings.util";

@Injectable()
export class DashboardService {
	private CACHE_KEY = "dashboard:summary";
	private TTL = 60; // 1min

	constructor(
		private prisma: PrismaService,
		private redis: RedisService,
	) {}

	async getSummary() {
		// try cache
		const cached = await this.redis.get(this.CACHE_KEY);
		if (cached) return JSON.parse(cached);

		// handle cache miss
		const [totalMedicines, activePharmacies, openAlerts, medicines] =
			await Promise.all([
				this.prisma.medicine.count(),
				this.prisma.pharmacy.count({
					where: { status: "ACTIVE" },
				}),
				this.prisma.alert.count({
					where: { status: "OPEN" },
				}),
				this.prisma.medicine.findMany({
					select: {
						id: true,
						targetPrice: true,
						priceObservations: {
							select: {
								unitPrice: true,
								observedAt: true,
							},
						},
					},
				}),
			]);

		let totalSavings = 0;

		for (const med of medicines) {
			const savings = calculateSavingsForMedicine({
				targetPrice: med.targetPrice,
				priceObservations: med.priceObservations,
			});

			if (!savings) continue;

			totalSavings += savings.potentialSavings;
		}

		const result = {
			total_medicines: totalMedicines,
			active_pharmacies: activePharmacies,
			open_alerts: openAlerts,
			savings_opportunity: Number(totalSavings.toFixed(2)),
		};

		await this.redis.set(this.CACHE_KEY, JSON.stringify(result), this.TTL);

		return result;
	}

	async invalidateCache() {
		await this.redis.del(this.CACHE_KEY);
	}
}
