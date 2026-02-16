# Tourney

A full-stack web application for creating and managing tournaments with pool stages and knockout brackets.

## Tech Stack

- **Backend:** Python 3.11+ with FastAPI
- **Frontend:** React 19 + Vite 7 + TailwindCSS v4
- **Database:** SQLite (development) / PostgreSQL (production)
- **Auth:** JWT-based authentication
- **Icons:** Lucide React

## Features

- **Authentication** – Admin registration/login with JWT tokens
- **Tournament Management** – Create, edit, delete tournaments with configurable formats
- **Player Management** – CRUD operations, CSV bulk import
- **Pool Stage** – Automatic group generation, round-robin matches, live standings
- **Fair Play Order** – Greedy scheduling algorithm ensures players get maximum rest between consecutive matches across all pools
- **Multi-Board Support** – Set the number of available boards and get per-board match lists where no player plays on two boards simultaneously; printable playlists per board
- **Knockout Bracket** – Winner bracket and loser bracket (single elimination each)
- **Flexible Advancement** – Choose players per pool or total advancing players (distributed equally, max 1 difference between pools, ties broken by larger pool size)
- **Match Scoring** – Easy score entry with automatic winner progression, bracket type indicators (W/L)
- **Dashboard** – Overview stats and quick actions
- **Dark Mode** – Full dark mode support
- **Responsive UI** – Mobile-friendly sidebar navigation

## Project Structure

```
vibetest/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, database, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # API endpoints
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic (pools, brackets)
│   │   ├── main.py        # FastAPI app entry point
│   │   └── seed.py        # Seed data script
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context (Auth)
│   │   ├── lib/           # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Seed sample data (creates admin user + 16 players)
python -m app.seed

# Start backend server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

### Default Admin Credentials

```
Username: admin
Password: admin123
```

## Docker Setup

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new admin |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/tournaments` | List tournaments |
| POST | `/api/tournaments` | Create tournament |
| GET | `/api/tournaments/{id}` | Get tournament |
| PUT | `/api/tournaments/{id}` | Update tournament |
| DELETE | `/api/tournaments/{id}` | Delete tournament |
| GET | `/api/tournaments/dashboard/stats` | Dashboard stats |
| POST | `/api/tournaments/{id}/players` | Add players to tournament |
| POST | `/api/tournaments/{id}/generate-pools` | Generate pool groups |
| GET | `/api/tournaments/{id}/pools` | Get pools with matches |
| GET | `/api/tournaments/{id}/standings` | Get pool standings |
| PUT | `/api/tournaments/{id}/pool-matches/{mid}/score` | Score pool match |
| POST | `/api/tournaments/{id}/generate-bracket` | Generate knockout bracket (query: `winners_per_pool` or `total_winners`) |
| GET | `/api/tournaments/{id}/bracket` | Get bracket matches |
| PUT | `/api/tournaments/{id}/bracket-matches/{mid}/score` | Score bracket match |
| GET | `/api/players` | List all players |
| POST | `/api/players` | Create player |
| POST | `/api/players/import-csv` | Import players from CSV |

## Tournament Flow

1. **Create Tournament** – Set name, format, group size, best-of legs for pool and knockout
2. **Add Players** – Assign players from the player pool
3. **Generate Pools** – Auto-creates groups and round-robin matches with fair play order
4. **Play Pool Matches** – Enter scores via Match Entry (supports multi-board layout); view live standings
5. **Generate Bracket** – Choose advancement mode:
   - *Per pool*: fixed number of top players from each pool
   - *Total players*: set total advancing count, distributed equally across pools (max 1 difference, ties prefer larger pools)
6. **Play Knockout Matches** – Winner/loser bracket progression with W/L indicators
7. **Winner** – Tournament winner determined

## Configuration

Environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite://./tournaments.db` | Database connection string |
| `SECRET_KEY` | (change in production) | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiry (24h) |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |

## Extending Tournament Formats

The service layer is designed for extensibility. To add new formats:

1. Create a new service in `backend/app/services/` (e.g., `single_elim_service.py`)
2. Implement match generation and progression logic
3. Add routes in `backend/app/routers/tournaments.py`
4. Create corresponding frontend components

## License

MIT
