# IntellMeet

AI-powered enterprise meeting and collaboration platform.

## Structure

- `client/` — React 19 + Vite frontend
- `server/` — Node.js API (Express, MongoDB, Socket.IO)

## Quick start

See [server/README.md](server/README.md) for prerequisites, environment variables, and running the full stack.

```bash
# Backend
cd server && npm install && cp .env.example .env && npm run dev

# Frontend (separate terminal)
cd client && npm install && npm run dev
```

- API: http://localhost:5000  
- App: http://localhost:5173
