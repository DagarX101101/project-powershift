# Environment Configuration Guide — Project PowerShift

This document details all required and optional environment variables for configuring the backend server and frontend client in development and production environments.

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

### 1. `DATABASE_URL`
* **Type**: `string` (PostgreSQL Connection URI)
* **Required**: Yes
* **Description**: Connection string for your PostgreSQL database instance.
* **Production Recommendation**: Use a connection-pooled URI (e.g. via PgBouncer or serverless connection pooling).
* **Format**:
  ```env
  DATABASE_URL="postgresql://username:password@hostname:5432/database_name?schema=public"
  ```

### 2. `PORT`
* **Type**: `number`
* **Default**: `5000`
* **Description**: Port number on which the Express server binds and listens.

### 3. `NODE_ENV`
* **Type**: `'development' | 'production'`
* **Default**: `'development'`
* **Description**: Defines execution behavior:
  * In `development`, verbose Prisma queries and database logs are printed. Rate limiting allows 5,000 requests per 15 minutes.
  * In `production`, variables are strictly checked at boot, and rate limiting is capped at 100 requests per 15 minutes.

### 4. `JWT_SECRET`
* **Type**: `string`
* **Required**: Yes (Strictly checked at server boot in production)
* **Description**: Secret key used to sign client Access tokens.
* **Production Recommendation**: Generate a secure 64-character hex string.

### 5. `REFRESH_SECRET`
* **Type**: `string`
* **Required**: Yes (Strictly checked at server boot in production)
* **Description**: Secret key used to sign client Refresh tokens.
* **Production Recommendation**: Generate a secure 64-character hex string separate from `JWT_SECRET`.

---

## Frontend Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

### 1. `VITE_API_URL`
* **Type**: `string` (URL)
* **Default**: `'http://localhost:5000/api'`
* **Description**: Base HTTP URL of the backend API server.
* **Production Recommendation**: Update this to the domain mapping of your reverse proxy or load balancer (e.g. `https://api.powershift.com/api`).
