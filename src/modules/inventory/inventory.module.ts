import { Module } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { InventoryController } from "./inventory.controller";
import { AlertModule } from "../alert/alert.module";
import { DashboardModule } from "../dashboard/dashboard.module";

@Module({
	imports: [AlertModule, DashboardModule],
	controllers: [InventoryController],
	providers: [InventoryService],
})
export class InventoryModule {}
