import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
	private client: Redis;

	constructor(private configService: ConfigService) {
		this.client = new Redis({
			host: this.configService.get<string>("REDIS_HOST"),
			port: this.configService.get<number>("REDIS_PORT"),
		});
	}

	async get(key: string) {
		return this.client.get(key);
	}

	async set(key: string, value: string, ttl: number) {
		return this.client.set(key, value, "EX", ttl);
	}

	async del(key: string) {
		return this.client.del(key);
	}

	async onModuleDestroy() {
		await this.client.quit();
	}
}
