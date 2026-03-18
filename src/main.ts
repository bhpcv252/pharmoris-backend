import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Logger } from "nestjs-pino";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { logger } from "./common/logger/logger";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
	});

	app.useLogger(app.get(Logger));

	const configService = app.get(ConfigService);

	app.useGlobalFilters(new HttpExceptionFilter());

	app.useGlobalInterceptors(new LoggingInterceptor());

	const swaggerConfig = new DocumentBuilder()
		.setTitle("PHARMORIS API")
		.setDescription("Pharmaceutical Intelligence Platform")
		.setVersion("1.0")
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup("docs", app, document);

	const port = configService.get<number>("PORT", 3000);

	await app.listen(port);

	const logger = app.get(Logger);
	logger.log(`Application is running on port ${port}`);
}

bootstrap().catch((err: unknown) => {
	// fallback logger
	console.error("App failed to start", err);
});
