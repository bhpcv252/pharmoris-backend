import { IsUUID, IsNumber } from "class-validator";

export class CreatePriceDto {
	@IsUUID()
	medicine_id: string;

	@IsUUID()
	supplier_id: string;

	@IsNumber()
	unit_price: number;
}
