# PHARMORIS Backend Service

This README provides instructions to get started locally, understand the architecture, and run the service with Docker.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Running the Service](#running-the-service)
- [Database Migrations & Seeding](#database-migrations--seeding)
- [API Endpoints](#api-endpoints)
- [Caching](#caching)
- [Testing](#testing)
- [Known Limitations](#known-limitations)
- [Detailed Architecture](#detailed-architecture)
- [AI Tools](#ai-tools)

---

## Architecture

The service follows a **modular layered architecture**:

- **Modules**:
  - `Auth` – JWT authentication, role-based authorization (admin, analyst)
  - `Medicine` – CRUD and listing of medicines
  - `Inventory` – Ingest inventory snapshots & trigger low-stock alerts
  - `Pricing` – Record price observations & trigger price spike alerts
  - `Alert` – Manage alerts for low stock and price spikes
  - `Dashboard` – High-level summary metrics
  - `Report` – Cost-savings opportunities

- **Persistence**: PostgreSQL with Prisma ORM
- **Caching**: Redis for dashboard summary and cost-savings report
- **Observability**: Structured logging using Pino

**Core Entities**: `User`, `Pharmacy`, `Manufacturer`, `Supplier`, `Medicine`, `InventorySnapshot`, `PriceObservation`, `Alert`.

For a visual representation of the architecture:
[Detailed Architecture Diagram](https://excalidraw.com/#json=F2h5YRkH5Ru5R38yuOGFJ,DUnWnkpAGbPdUR1BPvmV2w)

---

## Prerequisites

### Required

- **Docker & Docker Compose**: everything runs inside containers; no local database or Redis setup needed.

### Good to Have (for local development outside Docker)

- Node.js >= 20 (Node 22 is used inside Docker)
- pnpm
- PostgreSQL (if running outside Docker)
- Redis (if running outside Docker)

---

## Setup & Installation

1. **Clone the repository**

```bash
git clone https://github.com/bhpcv252/pharmoris-backend.git
cd pharmoris-backend
```

2. **Environment Variables**

Copy `.env.example` to `.env` and update values:

---

## Running the Service

```bash
docker compose up --build
```

- API will be available at: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`

---

## Database Migrations & Seeding

After the containers are up, run migrations and seed the database:

**Apply existing migrations:**

```bash
docker compose exec api pnpm prisma migrate deploy
```

**Create and apply a new migration:**

```bash
docker compose exec api pnpm prisma migrate dev --name init
```

**Seed the database with initial data:**

```bash
docker compose exec api pnpm prisma db seed
```

The seed script adds:

- Admin user: `admin@pharmoris.com`, Analyst user: `analyst@pharmoris.com`
- Sample pharmacies, suppliers, manufacturers, medicines
- Sample inventory snapshots & price observations

### Fetching Seeded IDs

Since there are no dedicated listing endpoints for suppliers, pharmacies, and manufacturers yet, you can query the database directly to get the seeded IDs needed for API requests:

```bash
docker exec -it pharmoris-db psql -U postgres -d pharmoris -c "
SELECT 'manufacturer' as type, id, name FROM \"Manufacturer\"
UNION ALL
SELECT 'supplier', id, name FROM \"Supplier\"
UNION ALL
SELECT 'pharmacy', id, name FROM \"Pharmacy\"
UNION ALL
SELECT 'medicine', id, name FROM \"Medicine\";
"
```

---

## API Endpoints

The API is documented via **Swagger UI** at:

```
http://localhost:3000/docs
```

However for a complete collection with example requests and environment setup, **import `PHARMORIS API.postman_collection.json`** into Postman, it's available at the root of the repository and covers all endpoints end-to-end.

### Quick Reference

| Module    | Method | Path                    | Description                                   |
| --------- | ------ | ----------------------- | --------------------------------------------- |
| Auth      | POST   | `/auth/login`           | Authenticate user, returns JWT                |
| Medicines | GET    | `/medicines`            | List medicines (pagination & filters)         |
| Medicines | POST   | `/medicines`            | Create medicine _(Admin only)_                |
| Inventory | POST   | `/inventory-snapshots`  | Record snapshot, triggers low-stock alerts    |
| Pricing   | POST   | `/price-observations`   | Record supplier price, triggers spike alerts  |
| Alerts    | GET    | `/alerts`               | List alerts (filter by `status`, `severity`)  |
| Dashboard | GET    | `/dashboard/summary`    | High-level counts, open alerts, total savings |
| Reports   | GET    | `/reports/cost-savings` | Cost-saving opportunities by medicine         |

---

## Caching

- **Dashboard summary** – Redis cache with 1–2 min TTL, invalidated on new inventory snapshot, price observation, or alert
- **Cost-saving report** – Redis cache with 5–10 min TTL, invalidated on new price observation or medicine update

---

## Testing

Run unit and integration tests:

```bash
pnpm test
pnpm test:e2e
```

Coverage reports will be generated under `coverage/`.

---

## Known Limitations

- **No historical validation on ingestion**: Inventory and price ingestion APIs do not yet validate against historical inconsistencies or duplicate entries beyond primary keys.
- **No conflict resolution**: No automated conflict resolution if multiple snapshots or price observations arrive simultaneously for the same medicine.
- **Basic Redis caching**: Redis is used for caching, but the current setup serialises the full dashboard/cost-savings JSON and invalidates the entire cache. A more granular approach (caching individual metrics and invalidating only affected ones) would improve performance.
- **Limited test coverage**: Tests are implemented for the inventory and pricing services to verify alert behaviour; broader test coverage across other modules is still needed.
- **Basic authentication**: JWT-based authentication exists, but additional security layers (rate limiting, audit logging, etc.) are not yet implemented.
- **Missing listing endpoints**: There are no endpoints to list suppliers, pharmacies, or manufacturers. These IDs are required when sending requests to the current API and must currently be fetched by querying the database directly (see [Fetching Seeded IDs](#fetching-seeded-ids)).

---

## Detailed Architecture

[View Architecture Diagram on Excalidraw](https://excalidraw.com/#json=F2h5YRkH5Ru5R38yuOGFJ,DUnWnkpAGbPdUR1BPvmV2w)

---

## Usage of AI Tools

AI tools were used in parts of the development and documentation process:

- **Seed data generation** – Realistic sample data for pharmacies, suppliers, manufacturers, medicines, inventory snapshots, and price observations was generated with the help of AI assistants.
- **Documentation** – This README and other supporting docs were drafted and refined with AI assistance.
