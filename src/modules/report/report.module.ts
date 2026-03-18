import { Module } from "@nestjs/common";
import { ReportService } from "./report.service";
import { ReportController } from "./report.controller";
import { RedisModule } from "../../common/redis/redis.module";

@Module({
	imports: [RedisModule],
	controllers: [ReportController],
	providers: [ReportService],
	exports: [ReportService],
})
export class ReportModule {}
