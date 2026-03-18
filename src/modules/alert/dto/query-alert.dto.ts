import { IsOptional, IsEnum } from "class-validator";

export enum AlertStatus {
	OPEN = "OPEN",
	RESOLVED = "RESOLVED",
}

export enum AlertSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
}

export class QueryAlertDto {
	@IsOptional()
	@IsEnum(AlertStatus)
	status?: AlertStatus;

	@IsOptional()
	@IsEnum(AlertSeverity)
	severity?: AlertSeverity;
}
