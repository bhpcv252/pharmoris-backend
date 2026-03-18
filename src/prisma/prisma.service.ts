import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "../common/logger/logger";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
	constructor() {
		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		super({ adapter } as any);
	}

	async onModuleInit() {
		await this.$connect();
		logger.info("Prisma connected to database");
	}
}
