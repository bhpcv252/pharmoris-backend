FROM node:22-alpine

# install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# copy lock + package first
COPY package.json pnpm-lock.yaml ./

# install deps
RUN pnpm install

# copy rest
COPY . .

# generate prisma client
RUN pnpm prisma generate

EXPOSE 3000

CMD ["pnpm", "start:dev"]
