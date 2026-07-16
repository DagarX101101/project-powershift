# Changelog — Project PowerShift

All notable changes and releases for Project PowerShift will be documented in this file.

---

## [1.0.0] — 2026-07-16

### Initial Production Release

This release establishes the baseline production build of the EV deployment planning and analytics portal.

### Major Features

#### 1. System Architecture
* Established monorepo layout separating `frontend/` (React SPA client) and `backend/` (Node.js/Express API).
* Standardized typings inside the `shared/` package for compile-time API schema synchronization.

#### 2. Authentication & Authorization
* Implemented secure token-based user authentication using JWT access and refresh tokens.
* Configured HttpOnly, Secure, SameSite cookies to protect tokens from CSRF and XSS.
* Established Role-Based Access Control (RBAC) separating **Admin**, **Engineer**, and **Viewer** permissions.
* Implemented forced password reset redirect shields.

#### 3. Executive Dashboard
* Dynamic KPI aggregations representing total EV fleets, deployable status, available power, and grid demands.
* High-contrast graphical meters showing real-time site readiness metrics.
* Smooth selector triggers filtering calculation sheets by specific mines and financial years.

#### 4. Master Sheet Console
* Consolidated data grid representing parameters, units, and year-by-year targets.
* Interactive calculation controls enabling manual parameter recalculations.
* Copy Table action copying formatted tables for clean pasting into Excel or Sheets.

#### 5. Engineering Calculation Engine
* Built central calculators executing EV fleets, TOD energy profiles, and required megavolt-amperes.
* Synchronized calculation result storage with PostgreSQL database cache.

#### 6. Export & Reports Portal
* High-fidelity print stylesheet hiding sidebar controls and formatting grids for standard A4 landscape/portrait outputs.
* PDF report builder applying vector branding logos and aligned table margins.
* Excel worksheet exports featuring correct widths and custom styles.

#### 7. Administration Panel
* User administration panel allowing additions, deactivations, password resets, and audit trail monitors.
* Active access request portal allowing managers to approve or reject registrations.

---

### Known Limitations
* Calculation engines operate synchronously on API calls. Large-scale database queries could introduce latency.
* PDF report generation is handled entirely on the backend server. High concurrent traffic might increase CPU utilization.

---

### Future Improvements
* **Async Workers**: Move PDF/Excel exports and planning recalculations to background worker processes.
* **Database Pooling**: Integrate robust database connection poolers (PgBouncer) for database traffic scaling.
* **Notification System**: Introduce real-time email triggers notifying users of registration approvals.
