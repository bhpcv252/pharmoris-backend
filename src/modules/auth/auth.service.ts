import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { logger } from "../../common/logger/logger";

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
	) {}

	async login(email: string, password: string) {
		const user = await this.prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			logger.warn({ email }, "User not found");
			throw new UnauthorizedException("Invalid credentials");
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			logger.warn({ email }, "Invalid password");
			throw new UnauthorizedException("Invalid credentials");
		}

		const payload = {
			sub: user.id,
			email: user.email,
			role: user.role,
		};

		const access_token = this.jwtService.sign(payload);

		logger.info({ userId: user.id }, "User logged in");

		return {
			access_token,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
		};
	}
}
