# Tourney

A full-stack web application for managing darts tournaments with pool stages, double-elimination knockout brackets, and a cross-tournament ranking system.

## Tech Stack

- **Backend:** Python 3.11+ / FastAPI 0.129 / SQLAlchemy 2.0 / Pydantic 2.12
- **Frontend:** React 19 / Vite 7 / Tailwind CSS v4
- **Database:** SQLite (volume-mounted)
- **Auth:** JWT (PyJWT + bcrypt)
- **Icons:** Lucide React
- **Deployment:** Docker Compose (backend + nginx frontend)

## Features

### Tournament Management
- Create, edit, delete tournaments with configurable game format, group size, and best-of legs (pool & knockout)
- Four-stage lifecycle: **Not Started → Pool Stage → Knockout Stage → Finished**
- Publish/unpublish tournaments for public viewing
- Link tournaments to a ranking for automatic point tracking

### Player Management
- Full CRUD, bulk create, and CSV import (name / nickname / email)
- Assign players to tournaments with seed ordering

### Pool Stage
- Automatic group generation by configurable group size
- Round-robin match scheduling within each pool
- **Fair play order** – greedy algorithm maximises rest between consecutive matches across all pools
- **Multi-board support** – set the number of available boards; get per-board match lists where no player plays on two boards simultaneously; printable playlists per board
- Live standings with W / L / LD / Pts

### Knockout Stage
- **Double-elimination bracket** – winner bracket and loser bracket
- Flexible advancement from pools:
  - *Per pool* – fixed number of top players from each pool
  - *Total players* – distributed equally across pools (max 1 difference; ties broken by larger pool)
- Same-pool separation seeding to avoid early rematches
- Automatic winner progression and cascade reset when scores change
- **Auto-finish** – tournament status set to *finished* when all bracket matches are complete

### Ranking System
- Create rankings and link multiple tournaments
- **Fixed mode** – configurable points per placement (1st–8th + participation)
- **Flexible mode** – separate base points for winner / loser bracket players, plus bonus points per bracket match win with independent WB / LB multipliers
- **Auto-ranking** – points are calculated automatically when a linked tournament finishes
- Manual recalculate (per tournament or entire ranking)
- Aggregated standings: total points, tournaments played, best placement, per-tournament breakdown
- Ranking points displayed on bracket page (star badge next to each player)

### Public Pages (no login required)
- Browse published tournaments with pools, standings, and bracket
- View all rankings and their standings

### User & Access Control
- JWT-based authentication with registration approval workflow
- First registered user is auto-promoted to admin
- Role-based access: admins see everything; regular users see only their own tournaments and rankings
- Admin user management: approve / reject / delete users, change roles
- Password change

### UI
- Dark / light theme toggle
- Responsive sidebar navigation
- Dashboard with quick stats (active tournaments, total players, matches played)
- Printable bracket sections

## Project Structure

```
tourney/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # SQLAlchemy models (User, Player, Tournament, Pool, BracketMatch, Ranking, RankingEntry)
│   │   ├── routers/        # API endpoints (auth, players, tournaments, rankings, users, public)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic (pool_service, bracket_service, ranking_service)
│   │   ├── main.py         # FastAPI app entry point
│   │   └── seed.py         # Seed data (admin user + sample players)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # BracketView, PoolsView, StandingsView, MatchEntry, Sidebar, Layout, …
│   │   ├── pages/          # Dashboard, Tournaments, Players, Rankings, Bracket, Settings, Public pages, …
│   │   ├── context/        # AuthContext, ThemeContext
│   │   ├── lib/            # Axios API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Quick Start

### Docker (recommended)

```bash
cp docker-compose.yml.example docker-compose.yml
# Edit docker-compose.yml – set SECRET_KEY and CORS_ORIGINS
docker compose up --build -d
```

- **App:** http://localhost
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

The SQLite database is stored at `./data/tourney.db` (volume-mounted).

### Default Admin Credentials

```
Username: admin
Password: admin123
```

### Local Development

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed sample data (creates admin user + 16 players)
python -m app.seed

uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

## API Endpoints

### Auth (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user info |
| PUT | `/api/auth/change-password` | Change password |

### Players (`/api/players`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/players` | List all players |
| POST | `/api/players` | Create player |
| POST | `/api/players/bulk` | Bulk create players |
| POST | `/api/players/import-csv` | Import from CSV |
| GET | `/api/players/{id}` | Get player |
| PUT | `/api/players/{id}` | Update player |
| DELETE | `/api/players/{id}` | Delete player |

### Tournaments (`/api/tournaments`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tournaments/dashboard/stats` | Dashboard statistics |
| GET | `/api/tournaments` | List tournaments |
| POST | `/api/tournaments` | Create tournament |
| GET | `/api/tournaments/{id}` | Get tournament |
| PUT | `/api/tournaments/{id}` | Update tournament |
| DELETE | `/api/tournaments/{id}` | Delete tournament |
| PUT | `/api/tournaments/{id}/publish` | Toggle public visibility |
| GET | `/api/tournaments/{id}/players` | List tournament players |
| POST | `/api/tournaments/{id}/players` | Add players |
| DELETE | `/api/tournaments/{id}/players/{pid}` | Remove player |
| POST | `/api/tournaments/{id}/generate-pools` | Generate pools & matches |
| GET | `/api/tournaments/{id}/pools` | Get pools |
| GET | `/api/tournaments/{id}/standings` | Pool standings |
| PUT | `/api/tournaments/{id}/pool-matches/{mid}/score` | Score pool match |
| POST | `/api/tournaments/{id}/generate-bracket` | Generate knockout bracket |
| GET | `/api/tournaments/{id}/bracket` | Get bracket matches |
| PUT | `/api/tournaments/{id}/bracket-matches/{mid}/score` | Score bracket match |
| GET | `/api/tournaments/{id}/ranking-points` | Ranking points per player |

### Rankings (`/api/rankings`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rankings` | List rankings |
| POST | `/api/rankings` | Create ranking |
| GET | `/api/rankings/{id}` | Get ranking |
| PUT | `/api/rankings/{id}` | Update ranking |
| DELETE | `/api/rankings/{id}` | Delete ranking |
| GET | `/api/rankings/{id}/standings` | Aggregated standings |
| POST | `/api/rankings/{id}/recalculate` | Recalculate all tournaments |
| POST | `/api/rankings/{id}/recalculate/{tid}` | Recalculate one tournament |
| GET | `/api/rankings/{id}/tournaments` | Tournaments in ranking |

### Users (`/api/users`) — admin only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/pending` | Pending approvals |
| PUT | `/api/users/{id}` | Update role / approval |
| POST | `/api/users/{id}/approve` | Approve user |
| POST | `/api/users/{id}/reject` | Reject (delete) user |
| DELETE | `/api/users/{id}` | Delete user |

### Public (`/api/public`) — no auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/tournaments` | Published tournaments |
| GET | `/api/public/tournaments/{id}` | Single published tournament |
| GET | `/api/public/tournaments/{id}/pools` | Pools |
| GET | `/api/public/tournaments/{id}/standings` | Pool standings |
| GET | `/api/public/tournaments/{id}/bracket` | Bracket |
| GET | `/api/public/tournaments/{id}/ranking-points` | Ranking points |
| GET | `/api/public/rankings` | All rankings |
| GET | `/api/public/rankings/{id}` | Single ranking |
| GET | `/api/public/rankings/{id}/standings` | Ranking standings |

## Tournament Flow

1. **Create Tournament** – set name, format, group size, best-of legs for pool and knockout, optionally link to a ranking
2. **Add Players** – assign players from the global player pool
3. **Generate Pools** – auto-creates groups and round-robin matches with fair play order
4. **Play Pool Matches** – enter scores via Match Entry (supports multi-board layout); view live standings
5. **Generate Bracket** – choose advancement mode:
   - *Per pool:* fixed number of top players from each pool
   - *Total players:* total advancing count distributed equally across pools
6. **Play Knockout Matches** – winner / loser bracket progression with automatic advancement
7. **Finish** – tournament auto-finishes when all bracket matches are complete; ranking points are calculated automatically if linked to a ranking

## Configuration

Environment variables (set in `docker-compose.yml` or `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///app/tourney.db` | Database connection string |
| `SECRET_KEY` | *(change in production)* | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiry (24 hours) |
| `CORS_ORIGINS` | `http://localhost` | Allowed CORS origins |

### Generate a SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## License

MIT
