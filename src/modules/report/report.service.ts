import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { calculateSavingsForMedicine } from "../../common/analytics/savings.util";

@Injectable()
export class ReportService {
	private CACHE_KEY = "reports:cost-savings";
	private TTL = 300; // 5mins

	constructor(
		private prisma: PrismaService,
		private redis: RedisService,
	) {}

	async getCostSavings() {
		// try cache
		const cached = await this.redis.get(this.CACHE_KEY);
		if (cached) return JSON.parse(cached);

		//handle cache miss
		const medicines = await this.prisma.medicine.findMany({
			include: {
				priceObservations: {
					include: {
						supplier: true,
					},
				},
			},
		});

		const result = medicines
			.map((med) => {
				const savings = calculateSavingsForMedicine({
					targetPrice: med.targetPrice,
					priceObservations: med.priceObservations,
				});

				if (!savings || savings.potentialSavings <= 0) return null;

				return {
					medicine_id: med.id,
					medicine_name: med.name,
					current_price: savings.currentPrice,
					target_price: med.targetPrice,
					lowest_supplier_price: Number(savings.lowestPrice.toFixed(2)),
					best_supplier_id: savings.bestSupplierId,
					benchmark_price: Number(savings.benchmark.toFixed(2)),
					potential_savings: Number(savings.potentialSavings.toFixed(2)),
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.sort((a, b) => b.potential_savings - a.potential_savings);

		await this.redis.set(this.CACHE_KEY, JSON.stringify(result), this.TTL);

		return result;
	}

	async invalidateCache() {
		await this.redis.del(this.CACHE_KEY);
	}
}
