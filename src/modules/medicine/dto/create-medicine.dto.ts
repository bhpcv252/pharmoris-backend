import { IsString, IsUUID, IsNumber } from "class-validator";

export class CreateMedicineDto {
	@IsString()
	sku: string;

	@IsString()
	name: string;

	@IsUUID()
	manufacturer_id: string;

	@IsNumber()
	reorder_threshold: number;

	@IsNumber()
	target_price: number;
}
