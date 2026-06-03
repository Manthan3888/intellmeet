# IntellMeet Server

AI-powered enterprise meeting and collaboration platform (MERN stack).

## Prerequisites

- Node.js 20+
- MongoDB (local or Docker)
- Redis (optional, improves caching)

## Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your secrets
```

## Development

Run backend and frontend in separate terminals:

```bash
# Terminal 1 – server
cd server && npm run dev

# Terminal 2 – client
cd client && npm install && npm run dev
```

Or run both from server:

```bash
cd server && npm run dev:all
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Health | http://localhost:5000/api/health |
| Metrics | http://localhost:5000/metrics |

## Demo data

```bash
cd server
npm run seed
```

- Email: `demo@intellmeet.com`
- Password: `demo1234`
- Room code: `DEMO1234`

## Docker (production)

From the `server` folder (build context is parent `intellmeet/`):

```bash
cd server
docker compose up --build
```

App: http://localhost:5000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with hot reload |
| `npm run dev:all` | Start API + client together |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run production build |
| `npm run seed` | Seed demo data |
| `npm run test` | Run tests |

## Environment variables

See [`.env.example`](.env.example).

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | Access token secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `OPENAI_API_KEY` | No | Enables real AI summaries |
| `GOOGLE_CLIENT_ID` | No | Enables Google OAuth |
| `CLOUDINARY_*` | No | CDN for avatars/recordings |
| `REDIS_URL` | No | Session/meeting cache |

## Project structure

```
server/
├── src/
│   ├── config/       # DB, Redis, env
│   ├── middleware/   # Auth, metrics, validation
│   ├── models/       # Mongoose schemas
│   ├── routes/       # REST API
│   ├── services/     # AI, uploads, OAuth
│   ├── socket/       # WebRTC signaling, chat
│   ├── scripts/      # Seed script
│   └── index.ts      # Entry point
├── tests/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

Frontend lives in [`../client/`](../client/).

## Features

- JWT auth + Google OAuth (optional)
- WebRTC video meetings, screen share, recording
- Real-time chat, shared notes, live transcription
- AI meeting summaries and action items
- Team workspaces, Kanban boards
- Analytics dashboard with CSV export
- Admin panel (role: admin)

## License

MIT – Zidio Development Portfolio Project
