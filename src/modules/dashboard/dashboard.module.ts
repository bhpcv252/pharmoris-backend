import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { RedisModule } from "../../common/redis/redis.module";

@Module({
	imports: [RedisModule],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService],
})
export class DashboardModule {}
