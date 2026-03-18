import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertService } from "../alert/alert.service";
import { DashboardService } from "../dashboard/dashboard.service";

// Mock
const mockMedicine = {
	id: "med-1",
	name: "Paracetamol",
	reorderThreshold: 100,
};

const mockSnapshot = {
	id: "snap-1",
	pharmacyId: "pharmacy-1",
	medicineId: "med-1",
	quantityOnHand: 80,
};

const prismaMock = {
	medicine: {
		findUnique: jest.fn(),
	},
	inventorySnapshot: {
		create: jest.fn(),
	},
};

const alertServiceMock = {
	createLowStockAlert: jest.fn(),
};

const dashboardServiceMock = {
	invalidateCache: jest.fn(),
};

const baseDto = (quantity_on_hand: number) => ({
	medicine_id: "med-1",
	pharmacy_id: "pharmacy-1",
	quantity_on_hand,
});

// Tests
describe("InventoryService", () => {
	let service: InventoryService;

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				InventoryService,
				{ provide: PrismaService, useValue: prismaMock },
				{ provide: AlertService, useValue: alertServiceMock },
				{ provide: DashboardService, useValue: dashboardServiceMock },
			],
		}).compile();

		service = module.get<InventoryService>(InventoryService);

		prismaMock.medicine.findUnique.mockResolvedValue(mockMedicine);
		prismaMock.inventorySnapshot.create.mockResolvedValue(mockSnapshot);
		dashboardServiceMock.invalidateCache.mockResolvedValue(undefined);
		alertServiceMock.createLowStockAlert.mockResolvedValue(undefined);
	});

	describe("create() — medicine validation", () => {
		it("throws NotFoundException when medicine does not exist", async () => {
			prismaMock.medicine.findUnique.mockResolvedValue(null);

			await expect(service.create(baseDto(50))).rejects.toThrow(
				NotFoundException,
			);
		});

		it("looks up medicine by the dto medicine_id", async () => {
			await service.create(baseDto(200));

			expect(prismaMock.medicine.findUnique).toHaveBeenCalledWith({
				where: { id: "med-1" },
			});
		});
	});

	// Snapshot creation
	describe("create() — snapshot creation", () => {
		it("creates an inventory snapshot with the correct payload", async () => {
			await service.create(baseDto(200));

			expect(prismaMock.inventorySnapshot.create).toHaveBeenCalledWith({
				data: {
					pharmacyId: "pharmacy-1",
					medicineId: "med-1",
					quantityOnHand: 200,
				},
			});
		});

		it("returns the created snapshot", async () => {
			const result = await service.create(baseDto(200));
			expect(result).toEqual(mockSnapshot);
		});

		it("invalidates the dashboard cache after creating a snapshot", async () => {
			await service.create(baseDto(200));
			expect(dashboardServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
		});
	});

	// Low stock detection
	describe("Low-stock detection", () => {
		describe("when stock is above the threshold (no alert)", () => {
			it("does NOT trigger an alert when quantity equals the threshold", async () => {
				await service.create(baseDto(100)); // exactly at threshold
				expect(alertServiceMock.createLowStockAlert).not.toHaveBeenCalled();
			});

			it("does NOT trigger an alert when quantity is above the threshold", async () => {
				await service.create(baseDto(150));
				expect(alertServiceMock.createLowStockAlert).not.toHaveBeenCalled();
			});
		});

		describe("when stock is below the threshold (alert fires)", () => {
			it("triggers a low-stock alert when quantity is below threshold", async () => {
				await service.create(baseDto(50)); // 50 < 100
				expect(alertServiceMock.createLowStockAlert).toHaveBeenCalledTimes(1);
			});

			it("passes the correct payload to createLowStockAlert", async () => {
				await service.create(baseDto(50));

				expect(alertServiceMock.createLowStockAlert).toHaveBeenCalledWith({
					medicineId: "med-1",
					pharmacyId: "pharmacy-1",
					quantity: 50,
					threshold: 100,
					severity: "MEDIUM", // ratio = 0.5 → MEDIUM
				});
			});
		});

		describe("severity classification", () => {
			const cases: Array<[number, string, string]> = [
				// [quantity, expectedSeverity, description]
				[24, "HIGH", "ratio < 0.25 → HIGH"],
				[25, "HIGH", "ratio = 0.25 → HIGH (boundary, exclusive upper)"],
				[26, "MEDIUM", "ratio just above 0.25 → MEDIUM"],
				[49, "MEDIUM", "ratio < 0.5 → MEDIUM"],
				[50, "MEDIUM", "ratio = 0.5 → MEDIUM (boundary, exclusive upper)"],
				[51, "LOW", "ratio just above 0.5 → LOW"],
				[99, "LOW", "ratio < 1.0 → LOW"],
			];

			test.each(cases)(
				"quantity=%i triggers severity %s (%s)",
				async (quantity, expectedSeverity) => {
					await service.create(baseDto(quantity));

					expect(alertServiceMock.createLowStockAlert).toHaveBeenCalledWith(
						expect.objectContaining({ severity: expectedSeverity }),
					);
				},
			);
		});

		describe("edge cases", () => {
			it("triggers a HIGH severity alert when quantity is 0", async () => {
				await service.create(baseDto(0));

				expect(alertServiceMock.createLowStockAlert).toHaveBeenCalledWith(
					expect.objectContaining({ severity: "HIGH" }),
				);
			});

			it("triggers a HIGH severity alert when quantity is 1", async () => {
				await service.create(baseDto(1));

				expect(alertServiceMock.createLowStockAlert).toHaveBeenCalledWith(
					expect.objectContaining({ severity: "HIGH" }),
				);
			});

			it("still returns the snapshot even when a low-stock alert is fired", async () => {
				const result = await service.create(baseDto(10));
				expect(result).toEqual(mockSnapshot);
			});

			it("still invalidates the cache even when a low-stock alert is fired", async () => {
				await service.create(baseDto(10));
				expect(dashboardServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
			});
		});
	});
});
