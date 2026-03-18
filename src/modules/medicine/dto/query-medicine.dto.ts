import { IsOptional, IsNumberString, IsUUID, IsString } from "class-validator";

export class QueryMedicineDto {
	@IsOptional()
	@IsNumberString()
	page?: string;

	@IsOptional()
	@IsNumberString()
	limit?: string;

	@IsOptional()
	@IsUUID()
	manufacturerId?: string;

	@IsOptional()
	@IsString()
	sort?: string;
}
