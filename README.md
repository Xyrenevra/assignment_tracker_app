# AssignAI — AI-Powered Student Assignment Manager

AssignAI is a full-stack academic productivity platform built for college and university students to manage assignments, organize subjects, monitor deadlines on an interactive calendar, analyze academic progress, and collaborate with a context-aware Gemini AI study assistant.

## Implemented Features

- **Authentication & Data Isolation**: Student registration, login, logout, show/hide password, server-side `scrypt` password hashing, signed HS256 JWT sessions (`HttpOnly; Secure; SameSite=None; Partitioned` cookies + in-memory Bearer token), CSRF validation on cookie mutations, rate limiting, and strict `userId` isolation across all routes.
- **Demo Student Workspace**: One-click demo sign-in preloaded with 6 university subjects (Advanced Python, Operating Systems, Computer Networks, Software Engineering, Mathematics, Database Management Systems) and 12 relative-date assignments spanning completed, in-progress, pending, due-today, and overdue states.
- **Overview Dashboard**: Live KPI strip (Total, Completed, Pending, Overdue, Due Today, Completion %), interactive Recharts completion donut and 7-day weekly activity charts, subject-wise progress bars, upcoming deadline timeline, high-priority focus, recently added list, quick assignment creation, and AI Assistant shortcut.
- **Assignment Management (Full CRUD)**: Create, view, edit, and delete assignments with subtasks/checklists across **Table**, **Card**, and **Kanban** views, live search, subject/priority/status filters (including Overdue), deadline sorting, delete confirmation dialog, and automatic overdue classification (completed items are never counted as overdue).
- **Subject Management**: Create, edit, and color-code subjects with live completion progress cards; deleting a subject safely preserves its assignments as Unassigned.
- **Academic Calendar & Deadline Notifications**: Interactive monthly calendar with month navigation, Today button, color-coded deadlines, day detail inspector, direct "Add Here" scheduling, dynamic deadline labels (`Due today`, `Due tomorrow`, `Due in N days`, `Overdue by N days`), and configurable 1-day / 3-day / 7-day deadline reminders.
- **Gemini AI Assignment Assistant**: Multi-turn persistent chat powered server-side by `@google/genai` (`gemini-4-hydrogen` balanced mode and `gemini-3.1-flash-lite` fast mode), conversation history, New Chat, permission-based assignment context sharing, specific assignment selector, Markdown + syntax-formatted code block rendering, Copy, Regenerate, suggested prompts, and clear server-configuration alerts when `GEMINI_API_KEY` is unset.
- **Progress Analytics**: Interactive Recharts dashboard computed strictly from stored assignments (completion rate, completed vs pending vs overdue, on-time completion rate, weekly productivity trend, subject-wise completion, and priority distribution) with empty-state handling.
- **Profile, Settings & Dark Mode**: Manage profile info, change password, configure reminder preferences, and switch between Light and Dark themes persisted across sessions.

## System Architecture

```text
├── server.ts                  # Express server (port 3000), REST API, rate limiting, Vite/static serving
├── server/
│   ├── db.ts                  # Atomic file-backed persistent relational store + demo seeder
│   ├── security.ts            # scrypt password hashing, HS256 JWT, secure cookies, CSRF & rate limiter
│   ├── gemini.ts              # Server-side @google/genai client with context-aware academic prompts
│   └── schema.sql             # Normalized relational schema reference
├── src/
│   ├── App.tsx                # Authenticated SPA shell and state orchestration
│   ├── types.ts               # Shared TypeScript domain interfaces
│   ├── lib/api.ts             # Typed HTTP client (in-memory Bearer + cookie credentials)
│   ├── utils/
│   │   ├── academicLogic.ts   # Pure decoupled business rules (overdue, stats, analytics, validation)
│   │   └── academicLogic.test.ts # Node built-in unit tests (node:test)
│   └── components/            # Modular page views, modals, Markdown renderer, and toast UI
```

## Local Installation & Running

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   ```env
   GEMINI_API_KEY="your_real_gemini_api_key"
   PORT="3000"
   DATA_DIR="./data"
   ```

3. **Run unit tests**
   ```bash
   npx --yes tsx --test src/utils/academicLogic.test.ts
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

5. **Production build & start**
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## AI API Configuration

- `GEMINI_API_KEY` is read exclusively on the server (`server/gemini.ts`) and is never exposed to client bundles.
- In AI Studio, set `GEMINI_API_KEY` via **Settings > Secrets**.
- If `GEMINI_API_KEY` is missing or invalid, AssignAI displays a clear configuration notice and never falls back to simulated or hardcoded responses.

## Deployment Notes & Limitations

- **Deployment**: Can be deployed as a unified Node.js service (Cloud Run, Render, Railway, or Fly.io) running `npm run build` followed by `NODE_ENV=production npm start`, with `GEMINI_API_KEY` and `JWT_SECRET` set as environment secrets.
- **Storage**: Uses an atomic JSON database file (`./data/assignai.db.json`) for zero-configuration local/container persistence; for multi-instance horizontal scaling, swap `server/db.ts` to PostgreSQL or MongoDB using `server/schema.sql`.
- **Notifications**: Reminders are delivered in-app; email or push notifications would require an external SMTP or Web Push service.
