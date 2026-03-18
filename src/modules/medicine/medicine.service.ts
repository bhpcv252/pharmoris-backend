import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMedicineDto } from "./dto/create-medicine.dto";
import { QueryMedicineDto } from "./dto/query-medicine.dto";
import { DashboardService } from "../dashboard/dashboard.service";
import { ReportService } from "../report/report.service";
import { getPagination } from "../../common/utils/pagination";

@Injectable()
export class MedicineService {
	constructor(
		private prisma: PrismaService,
		private dashboardService: DashboardService,
		private reportService: ReportService,
	) {}

	async create(dto: CreateMedicineDto) {
		const medicine = await this.prisma.medicine.create({
			data: {
				sku: dto.sku,
				name: dto.name,
				manufacturerId: dto.manufacturer_id,
				reorderThreshold: dto.reorder_threshold,
				targetPrice: dto.target_price,
			},
		});

		await this.dashboardService.invalidateCache();
		await this.reportService.invalidateCache();

		return medicine;
	}

	async findAll(query: QueryMedicineDto) {
		const page = Number.parseInt(query.page || "1");
		const limit = Number.parseInt(query.limit || "20");

		const { skip, take } = getPagination(page, limit);

		const where: any = {};

		if (query.manufacturerId) {
			where.manufacturerId = query.manufacturerId;
		}

		const orderBy: any = {};

		if (query.sort) {
			orderBy[query.sort] = "asc";
		}

		const [data, total] = await Promise.all([
			this.prisma.medicine.findMany({
				where,
				skip,
				take,
				orderBy,
			}),
			this.prisma.medicine.count({ where }),
		]);

		return {
			data,
			meta: {
				page,
				limit,
				total,
			},
		};
	}
}
