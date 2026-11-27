# Student Life OS Frontend

Next.js 16 frontend for the Student Life OS application.

## Requirements

- Node.js 20+
- A running SLOS backend on `http://localhost:3001`

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `NEXT_PUBLIC_API_URL` to the backend `/api/v1` base URL. Mock Service Worker
support is disabled by default and can be enabled with
`NEXT_PUBLIC_ENABLE_MOCKS=true` for local UI development.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```
