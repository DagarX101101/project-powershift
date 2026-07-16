# Deployment Guide — Project PowerShift

This guide documents the procedures for packaging, deploying, and maintaining the Project PowerShift application in production environments.

## 1. Monorepo Build Pipeline

The project is structured as a monorepo. Build both services sequentially from the root directory:

```bash
# 1. Install workspace dependencies
npm install

# 2. Build the client SPA and backend application
npm run build
```

This compiles:
* **Frontend**: Compiles via `tsc && vite build`, outputting static files to `frontend/dist/`.
* **Backend**: Compiles TypeScript files via `tsc`, outputting production-ready JavaScript to `backend/dist/`.

---

## 2. Process Manager (PM2 Setup)

For production environments, run the backend using a process manager such as **PM2** to guarantee automatic restarts on crashes:

```bash
# Start the backend server
pm2 start backend/dist/server.js --name "powershift-backend"
```

---

## 3. Reverse Proxy Configuration (Nginx)

Nginx should be configured to serve the frontend static files directly and proxy API requests to the Express server running on port `5000`.

### Example Nginx Config:
```nginx
server {
    listen 80;
    server_name powershift.com;

    # Static frontend files
    location / {
        root /var/www/powershift/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API requests
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads access
    location /uploads/ {
        alias /var/www/powershift/backend/public/uploads/;
        expires 7d;
    }
}
```

---

## 4. Health & Monitoring

The Express server exposes two production-ready health routes:
* **Liveness check**: `/health` (Returns HTTP 200 uptime stats)
* **Readiness check**: `/ready` (Queries the PostgreSQL database to confirm liveness, returns HTTP 200 or HTTP 503 if disconnected)
