import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertService } from "../alert/alert.service";
import { DashboardService } from "../dashboard/dashboard.service";
import { ReportService } from "../report/report.service";

// Mocks
const mockMedicine = {
	id: "med-1",
	name: "Ibuprofen",
};

const mockObservation = {
	id: "obs-1",
	medicineId: "med-1",
	supplierId: "supplier-1",
	unitPrice: 120,
	observedAt: new Date(),
};

const prismaMock = {
	medicine: {
		findUnique: jest.fn(),
	},
	priceObservation: {
		findFirst: jest.fn(),
		create: jest.fn(),
	},
};

const alertServiceMock = {
	createPriceSpikeAlert: jest.fn(),
};

const dashboardServiceMock = {
	invalidateCache: jest.fn(),
};

const reportServiceMock = {
	invalidateCache: jest.fn(),
};

const baseDto = (unit_price: number) => ({
	medicine_id: "med-1",
	supplier_id: "supplier-1",
	unit_price,
});

const previousAt = (unitPrice: number) => ({
	id: "obs-prev",
	medicineId: "med-1",
	supplierId: "supplier-1",
	unitPrice,
	observedAt: new Date(Date.now() - 86_400_000), // 1 day ago
});

// Tests
describe("PricingService", () => {
	let service: PricingService;

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PricingService,
				{ provide: PrismaService, useValue: prismaMock },
				{ provide: AlertService, useValue: alertServiceMock },
				{ provide: DashboardService, useValue: dashboardServiceMock },
				{ provide: ReportService, useValue: reportServiceMock },
			],
		}).compile();

		service = module.get<PricingService>(PricingService);

		prismaMock.medicine.findUnique.mockResolvedValue(mockMedicine);
		prismaMock.priceObservation.findFirst.mockResolvedValue(null); // no previous by default
		prismaMock.priceObservation.create.mockResolvedValue(mockObservation);
		dashboardServiceMock.invalidateCache.mockResolvedValue(undefined);
		reportServiceMock.invalidateCache.mockResolvedValue(undefined);
		alertServiceMock.createPriceSpikeAlert.mockResolvedValue(undefined);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("create() — medicine validation", () => {
		it("throws NotFoundException when medicine does not exist", async () => {
			prismaMock.medicine.findUnique.mockResolvedValue(null);

			await expect(service.create(baseDto(100))).rejects.toThrow(
				NotFoundException,
			);
		});

		it("looks up medicine by the dto medicine_id", async () => {
			await service.create(baseDto(100));

			expect(prismaMock.medicine.findUnique).toHaveBeenCalledWith({
				where: { id: "med-1" },
			});
		});
	});

	describe("create() — observation creation", () => {
		it("fetches the most recent previous observation ordered by observedAt desc", async () => {
			await service.create(baseDto(100));

			expect(prismaMock.priceObservation.findFirst).toHaveBeenCalledWith({
				where: { medicineId: "med-1" },
				orderBy: { observedAt: "desc" },
			});
		});

		it("creates a price observation with the correct payload", async () => {
			await service.create(baseDto(120));

			expect(prismaMock.priceObservation.create).toHaveBeenCalledWith({
				data: {
					medicineId: "med-1",
					supplierId: "supplier-1",
					unitPrice: 120,
				},
			});
		});

		it("returns the created observation", async () => {
			const result = await service.create(baseDto(120));
			expect(result).toEqual(mockObservation);
		});

		it("invalidates the dashboard cache", async () => {
			await service.create(baseDto(100));
			expect(dashboardServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
		});

		it("invalidates the report cache", async () => {
			await service.create(baseDto(100));
			expect(reportServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
		});
	});

	describe("Price spike detection", () => {
		describe("when there is no previous observation", () => {
			it("does NOT trigger an alert on the very first price entry", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(null);

				await service.create(baseDto(999)); // any price, no baseline exists
				expect(alertServiceMock.createPriceSpikeAlert).not.toHaveBeenCalled();
			});
		});

		describe("when price has not spiked (increase ≤ 10%)", () => {
			it("does NOT alert when price is unchanged", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(100)); // 0% increase
				expect(alertServiceMock.createPriceSpikeAlert).not.toHaveBeenCalled();
			});

			it("does NOT alert when price drops", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(80)); // -20%
				expect(alertServiceMock.createPriceSpikeAlert).not.toHaveBeenCalled();
			});

			it("does NOT alert at exactly 10% increase (boundary — not strictly greater)", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(110)); // exactly 10%
				expect(alertServiceMock.createPriceSpikeAlert).not.toHaveBeenCalled();
			});

			it("does NOT alert just below the 10% threshold", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(109)); // 9%
				expect(alertServiceMock.createPriceSpikeAlert).not.toHaveBeenCalled();
			});
		});

		describe("when a price spike is detected (increase > 10%)", () => {
			it("triggers an alert when price increases by just over 10%", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(111)); // ~11%
				expect(alertServiceMock.createPriceSpikeAlert).toHaveBeenCalledTimes(1);
			});

			it("passes the correct payload to createPriceSpikeAlert", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(130)); // 30%

				const increase = (130 - 100) / 100; // 0.3
				expect(alertServiceMock.createPriceSpikeAlert).toHaveBeenCalledWith({
					medicineId: "med-1",
					previousPrice: 100,
					currentPrice: 130,
					increase,
					severity: "MEDIUM",
				});
			});

			it("still returns the created observation when a spike is detected", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				const result = await service.create(baseDto(200));
				expect(result).toEqual(mockObservation);
			});

			it("still invalidates both caches when a spike is detected", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(100),
				);

				await service.create(baseDto(200));
				expect(dashboardServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
				expect(reportServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
			});
		});

		describe("severity classification (previous price = 100)", () => {
			// [previousPrice, currentPrice, expectedSeverity, description]
			const cases: Array<[number, number, string, string]> = [
				[100, 111, "LOW", "11% → just above 10% threshold → LOW"],
				[100, 124, "LOW", "24% → below 25% boundary → LOW"],
				[
					100,
					125,
					"LOW",
					"25% → exactly at boundary (not strictly greater) → LOW",
				],
				[100, 126, "MEDIUM", "26% → just above 25% boundary → MEDIUM"],
				[100, 149, "MEDIUM", "49% → below 50% boundary → MEDIUM"],
				[
					100,
					150,
					"MEDIUM",
					"50% → exactly at boundary (not strictly greater) → MEDIUM",
				],
				[100, 151, "HIGH", "51% → just above 50% boundary → HIGH"],
				[100, 300, "HIGH", "200% → well above 50% boundary → HIGH"],
			];

			test.each(cases)(
				"prev=%i → curr=%i triggers severity %s (%s)",
				async (previousPrice, currentPrice, expectedSeverity) => {
					prismaMock.priceObservation.findFirst.mockResolvedValue(
						previousAt(previousPrice),
					);

					await service.create(baseDto(currentPrice));

					expect(alertServiceMock.createPriceSpikeAlert).toHaveBeenCalledWith(
						expect.objectContaining({ severity: expectedSeverity }),
					);
				},
			);
		});

		describe("edge cases", () => {
			it("calculates increase correctly with non-round prices", async () => {
				// previous = 9.99, current = 11.99 -> ~20% increase -> LOW
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(9.99),
				);

				await service.create(baseDto(11.99));

				expect(alertServiceMock.createPriceSpikeAlert).toHaveBeenCalledWith(
					expect.objectContaining({ severity: "LOW" }),
				);
			});

			it("triggers HIGH severity on an extreme price spike", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(previousAt(10));

				await service.create(baseDto(1000)); // 9900% increase
				expect(alertServiceMock.createPriceSpikeAlert).toHaveBeenCalledWith(
					expect.objectContaining({ severity: "HIGH" }),
				);
			});

			it("passes the computed increase ratio — not just raw prices — to the alert", async () => {
				prismaMock.priceObservation.findFirst.mockResolvedValue(
					previousAt(200),
				);

				await service.create(baseDto(260)); // 30% increase

				const expectedIncrease = (260 - 200) / 200; // 0.3
				expect(alertServiceMock.createPriceSpikeAlert).toHaveBeenCalledWith(
					expect.objectContaining({ increase: expectedIncrease }),
				);
			});
		});
	});
});
