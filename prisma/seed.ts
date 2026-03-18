import {
	PrismaClient,
	Role,
	PharmacyStatus,
	SupplierStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import pino from "pino";

const logger = pino({
	level: "info",
	base: { service: "seed-script" },
	transport: { target: "pino-pretty" },
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
	logger.info("Seeding started...");

	// Users
	const password: string = await bcrypt.hash("password123", 10);

	await prisma.user.upsert({
		where: { email: "admin@pharmoris.com" },
		update: {},
		create: {
			email: "admin@pharmoris.com",
			password,
			role: Role.ADMIN,
		},
	});
	logger.info({ email: "admin@pharmoris.com" }, "User added");

	await prisma.user.upsert({
		where: { email: "analyst@pharmoris.com" },
		update: {},
		create: {
			email: "analyst@pharmoris.com",
			password,
			role: Role.ANALYST,
		},
	});
	logger.info({ email: "analyst@pharmoris.com" }, "User added");

	// Manufacturers
	const pfizer = await prisma.manufacturer.upsert({
		where: { name: "Pfizer" },
		update: {},
		create: { name: "Pfizer" },
	});
	logger.info({ manufacturer: pfizer.name }, "Manufacturer added");

	const novartis = await prisma.manufacturer.upsert({
		where: { name: "Novartis" },
		update: {},
		create: { name: "Novartis" },
	});
	logger.info({ manufacturer: novartis.name }, "Manufacturer added");

	// Suppliers
	const supplierA = await prisma.supplier.upsert({
		where: { name: "MedSupply Co" },
		update: {},
		create: {
			name: "MedSupply Co",
			region: "North",
			status: SupplierStatus.ACTIVE,
		},
	});
	logger.info(
		{ supplier: supplierA.name, region: supplierA.region },
		"Supplier added",
	);

	const supplierB = await prisma.supplier.upsert({
		where: { name: "HealthDistrib" },
		update: {},
		create: {
			name: "HealthDistrib",
			region: "West",
			status: SupplierStatus.ACTIVE,
		},
	});
	logger.info(
		{ supplier: supplierB.name, region: supplierB.region },
		"Supplier added",
	);

	// Pharmacies
	const pharmacy1 = await prisma.pharmacy.upsert({
		where: { name: "CityCare Pharmacy" },
		update: {},
		create: {
			name: "CityCare Pharmacy",
			region: "Delhi",
			status: PharmacyStatus.ACTIVE,
		},
	});
	logger.info(
		{ pharmacy: pharmacy1.name, region: pharmacy1.region },
		"Pharmacy added",
	);

	const pharmacy2 = await prisma.pharmacy.upsert({
		where: { name: "MediPlus Store" },
		update: {},
		create: {
			name: "MediPlus Store",
			region: "Mumbai",
			status: PharmacyStatus.ACTIVE,
		},
	});
	logger.info(
		{ pharmacy: pharmacy2.name, region: pharmacy2.region },
		"Pharmacy added",
	);

	// Medicines
	const med1 = await prisma.medicine.upsert({
		where: { sku: "MED-001" },
		update: {},
		create: {
			sku: "MED-001",
			name: "Paracetamol 500mg",
			manufacturerId: pfizer.id,
			reorderThreshold: 50,
			targetPrice: 1.5,
		},
	});
	logger.info({ medicine: med1.name, sku: med1.sku }, "Medicine added");

	const med2 = await prisma.medicine.upsert({
		where: { sku: "MED-002" },
		update: {},
		create: {
			sku: "MED-002",
			name: "Amoxicillin 250mg",
			manufacturerId: novartis.id,
			reorderThreshold: 30,
			targetPrice: 3.0,
		},
	});
	logger.info({ medicine: med2.name, sku: med2.sku }, "Medicine added");

	// Inventory Snapshots
	await prisma.inventorySnapshot.createMany({
		data: [
			{
				pharmacyId: pharmacy1.id,
				medicineId: med1.id,
				quantityOnHand: 40,
			},
			{
				pharmacyId: pharmacy2.id,
				medicineId: med2.id,
				quantityOnHand: 100,
			},
		],
		skipDuplicates: true,
	});

	logger.info({ count: 2 }, "Inventory snapshots created");

	// Price Observations
	await prisma.priceObservation.createMany({
		data: [
			{
				medicineId: med1.id,
				supplierId: supplierA.id,
				unitPrice: 1.4,
			},
			{
				medicineId: med1.id,
				supplierId: supplierA.id,
				unitPrice: 1.7,
			},
			{
				medicineId: med2.id,
				supplierId: supplierB.id,
				unitPrice: 2.8,
			},
		],
		skipDuplicates: true,
	});

	logger.info({ count: 3 }, "Price observations created");

	logger.info("Seeding completed successfully");
}

main()
	.catch((e) => {
		logger.error(e, "Seeding failed");
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
