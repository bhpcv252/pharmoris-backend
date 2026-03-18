import { IsUUID, IsNumber } from "class-validator";

export class CreateInventoryDto {
	@IsUUID()
	pharmacy_id: string;

	@IsUUID()
	medicine_id: string;

	@IsNumber()
	quantity_on_hand: number;
}
