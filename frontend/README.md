# Yoga DB — Frontend

React + Vite + TypeScript + Tailwind CSS + React Router + Axios.

## Setup

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

App: http://localhost:5173

## Environment

| Variable | Default |
|----------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

## Pages

Home, Asanas (list + detail), Transitions, Flows, Search, About, Auth, Admin (role=admin).

See [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) for full project setup.
