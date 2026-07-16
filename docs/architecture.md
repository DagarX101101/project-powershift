# Project PowerShift Architecture Documentation

This document describes the software architecture and design decisions for Project PowerShift.

---

## 1. Monorepo Structure

* `backend/`: Node.js Express server using TypeScript and Prisma ORM.
* `frontend/`: React single-page application powered by Vite, TypeScript, and Tailwind CSS.
* `shared/`: Shared models, TypeScript types, and validation schemas.
* `docs/`: Deployment guides, engineering formulas, database layout, and API endpoints documentation.

---

## 2. Master Sheet & Calculations Architecture

To ensure strict data integrity and a single source of truth, Project PowerShift uses a **dynamic, on-the-fly calculation model** rather than storing calculated values in database tables.

### Data Flow Pipeline
```
  [Strap Data (Editable)]
             │
             ▼
  [Calculation Engine] ───────► [In-Memory Math Formulas]
             │
             ├────────────────► [Dashboard (KPIs & Regional Cards)]
             └────────────────► [Master Sheet (Filtered & Printed Grid)]
```

### Why we do NOT use CalculatedMasterRow in Database:
1. **Single Source of Truth**: Site inputs (Coal, OB production, power availability) are the only editable parameters. Keeping calculations out of PostgreSQL prevents sync drift.
2. **Performance**: Since there are only 14 mine sites and 5 financial years, calculations across all sites take <1ms in memory. Dynamic calculation guarantees instant accuracy with no database overhead.
