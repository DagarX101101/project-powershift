# Project PowerShift — Adani EV Deployment Tracking System
**Version**: v1.0.0

An engineering-grade planning, monitoring, and tracking platform for EV deployments across Adani Natural Resources sites. The platform aggregates EV vehicle needs, charging scheduling, power grid demands, and master plan metrics.

---

## 1. System Architecture

The application is structured as a full-stack TypeScript monorepo:
* **`frontend/`**: React 19 Client SPA built with Vite and compiled via TypeScript.
* **`backend/`**: Express REST API Server running on Node.js using Prisma ORM to interact with PostgreSQL.
* **`shared/`**: Shared TS type interfaces to guarantee schema consistency across API networks.
* **`docs/`**: Production guides, system environment settings, and architecture diagrams.

```text
                  +-----------------------------------+
                  |        Client Browser SPA         |
                  |     (React 19 + TypeScript)       |
                  +-----------------+-----------------+
                                    |
                                    | HTTP Requests (with Auth Headers)
                                    v
                  +-----------------+-----------------+
                  |         Express API Gateway       |
                  |        (Node.js + Helmet + CORS)  |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------+-----------+                       +-----------+-----------+
|   Calculation Engine  |                       |       Prisma ORM      |
|    (In-Memory Cache)  |                       |  (PostgreSQL DB Client)|
+-----------------------+                       +-----------+-----------+
                                                            |
                                                            v
                                                +-----------+-----------+
                                                |      PostgreSQL       |
                                                |   (Relational Cache)  |
                                                +-----------------------+
```

---

## 2. Tech Stack
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend**: Node.js, Express, TypeScript, Prisma ORM, Helmet (security headers), Compression, Express-Rate-Limit.
* **Database**: PostgreSQL (Prisma Client).
* **Caching**: In-memory data caches for calculation engines.

---

## 3. Folder Layout

```text
Project PowerShift/
├── frontend/             # Client React SPA
│   ├── src/
│   │   ├── components/   # Shared components (layout, grids)
│   │   ├── pages/        # Main views (Dashboard, Master Sheet, Reports)
│   │   ├── services/     # API connection instances
│   │   └── index.css     # Design tokens and custom theme overrides
│   └── .env.example
├── backend/              # Server REST API
│   ├── src/
│   │   ├── config/       # Databases initialization
│   │   ├── controllers/  # Route event controllers
│   │   ├── middleware/   # JWT verification & RBAC check blocks
│   │   └── server.ts     # Startup file & graceful shutdown
│   ├── prisma/           # Database migration and seed files
│   └── .env.example
├── shared/               # Shared TypeScript schemas
├── docs/                 # Guides & Architecture specifications
├── package.json          # Root scripts
└── README.md
```

---

## 4. Environment Variables

Both services require configuration templates. Copy files from their corresponding examples:

### Backend Configuration (`backend/.env`)
```env
DATABASE_URL="postgresql://username:password@hostname:5432/database?schema=public"
PORT=5000
NODE_ENV=production
JWT_SECRET="secure_access_token_key"
REFRESH_SECRET="secure_refresh_token_key"
CORS_ORIGIN="https://yourfrontend.com"
```

### Frontend Configuration (`frontend/.env`)
```env
VITE_API_URL="https://yourbackend.com/api"
```

---

## 5. Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v20+ recommended)
* [PostgreSQL](https://www.postgresql.org/) (v15+)

### Setup Commands
```bash
# 1. Install root & service dependencies
npm run install:all

# 2. Run Database Migrations (Backend)
cd backend
npx prisma migrate dev --name init

# 3. Seed Database Configuration
npx prisma db seed

# 4. Start Development Server (from root)
cd ..
npm run dev
```

---

## 6. Build Instructions

To compile the monorepo for production deployment:

```bash
# Build both frontend static assets and backend JS
npm run build
```

This compiles:
1. Frontend SPA inside `frontend/dist/`.
2. Backend API inside `backend/dist/`.

---

## 7. Deployment Preparation
* **Database**: Apply migrations in production using `npx prisma migrate deploy` and seed initial roles using `npx prisma db seed`.

---

## 8. Screen Previews & Placeholders
* **Executive Planning Dashboard**: Displays real-time KPIs, site-level EV demands, and charging schedules.
* **Master Calculation Sheet**: Complete parameter grids displaying targets and outputs for active years.
* **Reports Export Console**: PDF generation portal, printer previews, and raw Excel file downloads.

---

## 9. Future Roadmap
* **Async Task Queues**: Move planning recalculations and Excel exports to background worker threads.
* **Database Pooling**: Configure connection poolers (PgBouncer) for high traffic scaling.
* **Automated Mail Alerts**: Deliver system notifications upon user registration approvals.
