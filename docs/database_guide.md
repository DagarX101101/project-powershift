# Database Migration & Administration Guide — Project PowerShift

This document details the database schema maintenance, migrations pipeline, and data seeding details for Project PowerShift.

## 1. Schema Specifications

The schema is defined using Prisma in `backend/prisma/schema.prisma`. It utilizes **PostgreSQL** as the production provider. Key features:
* **Relational integrity**: Cascading deletes (`onDelete: Cascade`) configured across all relationships to prevent orphaned data records.
* **Audit trail**: Unified `report_history` table mapping generation timestamps and generator accounts.
* **Engineering schemas**: Centralized TOD schedules and calculations results tables.

---

## 2. Production Migrations

To apply database schema changes in production, run the Prisma migration deploy command:

```bash
# Apply pending database migrations
npx prisma migrate deploy
```

> [!CAUTION]
> Do NOT use `npx prisma migrate dev` in production as it can cause data loss or reset database configurations.

---

## 3. Database Seeding

To seed the initial hierarchy (Mines, Clusters, Electrical TOD periods, and Default Access accounts) into the database, run:

```bash
# Run seed query scripts
npx prisma db seed
```

This populates default administrator and engineering credentials:
* **Admin**: `admin@powershift.com` (password: `password123`)
* **Engineer**: `engineer@powershift.com` (password: `password123`)
* **Viewer**: `viewer@powershift.com` (password: `password123`)
