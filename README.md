# LigaMatch

Plataforma para crear y gestionar torneos de **fútbol** y **fútbol sala**.

- **API** – Node.js/TypeScript con Hapi.js, PostgreSQL (Knex + Objection), Jest
- **Web** – React 18 con TypeScript, Webpack, MUI, i18n (ES/EN), Jest + React Testing Library

**Funcionalidades principales:** torneos (crear, editar, grupos, sede única, categorías por edad), equipos e invitaciones, jugadores (datos extendidos, padre/madre/encargado con cédula y teléfono, documentos y foto), sedes por equipo (el admin del torneo puede agregar/editar/eliminar sedes de cualquier equipo), calendario round-robin, resultados, clasificación, notificaciones, mensajería, reportes PDF (Pro), subida de imágenes a Cloudinary (logos, fotos). Ver [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) para el estado detallado.

## Tech Stack

| Layer   | Technologies                                      |
| ------- | ------------------------------------------------- |
| API     | Hapi.js, Knex, Objection.js, PostgreSQL, TypeScript |
| Web     | React 18, Webpack 5, TypeScript, SCSS modules      |
| Tooling | Biome (lint/format), Husky, lint-staged, Jest     |

## Prerequisites

- Node.js v22.18.0 (use nvm)
- PostgreSQL v16
- npm v10.9.0+

## Setup

1. **Clone or copy** this template to a new directory.

2. **Install dependencies** (from project root):

   ```bash
   npm install
   ```

3. **Configure environment**:

   - Copy `api/.env.example` to `api/.env`
   - Copy `web/.env.example` to `web/.env`
   - Ensure `DATABASE_URL` in `api/.env` includes the database name, e.g. `postgres://postgres@127.0.0.1:5432/ligamatch_development`. If unset, it is built from `DATABASE_HOST` and `DATABASE_NAME`.

4. **Database setup** (requires PostgreSQL running):

   ```bash
   npm run db:setup
   ```

   This creates the database, runs migrations, and seeds. If you see `database "..." does not exist`, run this step first and ensure `api/.env` exists with correct values.

## Testing Data

The seed creates test users and sample tournaments for local development and manual testing.

### Test Users

| Email                     | Password  | Role             | Description                                      |
| ------------------------- | --------- | ---------------- | ------------------------------------------------ |
| `admin@ligamatch.local`   | `Admin123!` | system_admin     | Full admin; can manage users                     |
| `demo@ligamatch.local`    | `Demo123!`  | tournament_admin | Can create and manage tournaments                |
| `team-competitive@ligamatch.local` | `Team123!` | team_admin | Team owner – Spring Soccer (competitive)         |
| `team-recreational@ligamatch.local` | `Team123!` | team_admin | Team owner – Campeonato Juvenil Futsal (recreational, age categories) |
| `team-amateur@ligamatch.local`     | `Team123!` | team_admin | Team owner – Liga Futsal Verano (amateur)       |
| `team-owner-4@ligamatch.local`     | `Team123!` | team_admin | Team owner – Copa Local (Leones FC)               |

### Sample Tournaments and Teams

After seeding, four tournaments are created for the demo user:

| Tournament                    | Type         | Teams                                      | Team owner logins                                                       |
| ----------------------------- | ------------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| Spring Soccer League 2025     | competitive  | Central Park FC                             | `team-competitive@ligamatch.local`                                      |
| Campeonato Juvenil de Fútbol Sala | recreational | Rápidos U12                              | `team-recreational@ligamatch.local`                                     |
| Liga de Fútbol Sala Verano   | amateur      | Estrellas FC Sala                          | `team-amateur@ligamatch.local`                                          |
| Copa Local 2025               | competitive  | Estrellas FC, Dragones FC, Águilas FC, Leones FC | `team-competitive@ligamatch.local`, `team-recreational@ligamatch.local`, `team-amateur@ligamatch.local`, `team-owner-4@ligamatch.local` |

**Copa Local 2025** is ideal for testing the match calendar and results: it has four registered teams ready for schedule generation.

### Using the Test Data

1. **Run the seed** (if not already done):

   ```bash
   npm run db:seed
   ```

2. **Sign in via the web app** at [http://localhost:4000](http://localhost:4000):

   - Go to **Sign in**
   - Use `demo@ligamatch.local` / `Demo123!` to log in as a tournament creator
   - Use `admin@ligamatch.local` / `Admin123!` for admin features

3. **API login** (for Swagger or curl):

   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@ligamatch.local","password":"Demo123!"}'
   ```

   Use the returned `token` in the `Authorization: Bearer <token>` header for protected endpoints.

### Notifications API (CURL)

Replace `$TOKEN` with the token from the login response.

```bash
# List notifications (inbox)
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/notifications?limit=20"

# List only unread
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/notifications?unreadOnly=true"

# Mark one as read
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" "http://localhost:3000/notifications/{NOTIFICATION_ID}/read"

# Mark all as read
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" "http://localhost:3000/notifications/read-all"
```

### Messages API (CURL)

```bash
# List users you can message (same tournament)
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/messages/related-users"

# List your conversations
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/messages/conversations"

# Start or get a 1:1 conversation (replace OTHER_USER_ID with a UUID from related-users)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"otherUserId":"OTHER_USER_ID"}' "http://localhost:3000/messages/conversations"

# Get messages in a conversation (replace CONVERSATION_ID with the conversation id)
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/messages/conversations/CONVERSATION_ID/messages?limit=50"

# Send a message in a conversation
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"Hello, this is a test message."}' "http://localhost:3000/messages/conversations/CONVERSATION_ID/messages"

# Send a message to all teams in a tournament (tournament admin only; replace TOURNAMENT_ID)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"Message to all teams in this tournament."}' "http://localhost:3000/tournaments/TOURNAMENT_ID/messages/broadcast"

# Send to specific teams only (optional teamIds array)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"Message for selected teams.","teamIds":["TEAM_UUID_1","TEAM_UUID_2"]}' "http://localhost:3000/tournaments/TOURNAMENT_ID/messages/broadcast"
```

### Team Management Flow

1. **Tournament admin** (e.g. `demo@ligamatch.local`): Log in, open a tournament you created, click **Add team**.
2. **Create team**: Enter team name, description (optional), and owner email. An invitation is sent (or the invite link is copied to clipboard if SMTP is not configured).
3. **Team owner**: Receives email with link like `http://localhost:4000/register?invite=<token>`. Clicks link, creates account (email is pre-filled and locked).
4. **After registration**: User is redirected to the team page and can add players.
5. **Age categories**: If the tournament has age categories (e.g. Campeonato Juvenil de Fútbol Sala), the team owner can assign each player to a category (U12, U14, etc.) when adding them.

**Email (optional)**: Set `SMTP_URL` or `SMTP_HOST`/`SMTP_PORT` in `api/.env` to send real invitation emails. Without SMTP, the invite URL is logged to the console and copied to the clipboard when creating a team.

## Development Commands

```bash
# Start API (localhost:3000)
npm run start:api

# Start Web (localhost:4000)
npm run start:web

# Start both (opens Swagger at http://localhost:3000/documentation when API is ready)
npm run start:all

# Swagger UI: http://localhost:3000/documentation (open manually if auto-open fails)

# Type checking
npm run check-types

# Lint
npm run lint:all
npm run lint:fix

# Format
npm run format
npm run format:check

# Tests
npm run test:api
npm run test:web
```

### Storybook

Component development and documentation:

```bash
npm run storybook
```

Or from the `web/` directory: `npm run storybook`.

Runs Storybook at [http://localhost:6006](http://localhost:6006). Stories live next to components (e.g. `AppBar.stories.tsx`). To add a story, create a `*.stories.tsx` or `*.stories.mdx` under `web/src`; the config uses the same path aliases (`@shared`, `@components`, `@utils`) and Redux/MUI setup as the app.

## Project Structure

```
project-template/
├── api/                        # Backend
│   ├── src/
│   │   ├── _db/               # Knex, migrations, seeds
│   │   ├── auth/              # Login, register, JWT, forgot/reset password
│   │   ├── health/            # Health check
│   │   ├── matches/           # Partidos, generación calendario, eventos, estadísticas
│   │   ├── messages/          # Conversaciones y mensajes
│   │   ├── models/            # Objection (User, Tournament, Team, Player, Match, etc.)
│   │   ├── notifications/     # Notificaciones in-app
│   │   ├── schemas/           # Joi (validación)
│   │   ├── services/          # uploadService (Cloudinary/disco), emailService, standingsService
│   │   ├── swagger/           # Documentación API
│   │   ├── teams/             # Equipos, jugadores, sedes, invitaciones, change requests
│   │   ├── tournaments/       # Torneos, grupos, admins, standings
│   │   ├── users/             # Usuarios y roles
│   │   └── index.ts
│   ├── docs/                  # STORAGE.md (uploads, Cloudinary)
│   ├── environment.ts
│   └── package.json
├── web/
│   ├── src/
│   │   ├── app/               # Router, store
│   │   └── shared/             # components, api, i18n, utils
│   └── package.json
├── scripts/                   # build, install
├── .husky/
├── biome.json
└── package.json
```

## Storage (uploads)

Imágenes (logos de torneo/equipo, foto de jugador, etc.) pueden subirse a **Cloudinary** o guardarse en disco. Ver [api/docs/STORAGE.md](api/docs/STORAGE.md) para configuración (`CLOUDINARY_URL`) y tipos de archivo permitidos.

## Adding Domain Logic

- **API**: Add routes under `api/src/[domain]/`, e.g. `api/src/users/userRoutes.ts`
- **Web**: Add components under `web/src/shared/components/` or feature-specific folders
- **Database**: Create migrations with `npm run db:migrate:make:schema`

## Database Migrations

```bash
# Create schema migration
npm run db:migrate:make:schema

# Create data migration (staging/production only)
npm run db:migrate:make:data

# Run migrations
npm run db:migrate

# Rollback
npm run db:rollback
```
