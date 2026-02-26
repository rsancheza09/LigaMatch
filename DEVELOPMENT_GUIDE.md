# Guía de desarrollo – LigaMatch

Guía ordenada para completar cada sección del proyecto y sugerencias basadas en plataformas similares (LeagueApps, PlayHQ, TeamSnap, SyncedSport).

---

## 1. Estado actual (lo que ya existe)

### 1.1 Autenticación
- [x] Login / Registro
- [x] Registro por invitación (equipos)
- [x] Redux + persistencia en localStorage
- [x] Roles: `system_admin`, `tournament_admin`, `team_admin`
- [x] Planes: `free` / `pro`

### 1.2 Torneos
- [x] Crear torneo (fútbol o fútbol sala, fechas, ubicación, tipo)
- [x] Categorías por edad (U12, U14, etc.)
- [x] Página pública con slug
- [x] Logo y colores personalizados (Pro)
- [x] Listado filtrado (públicos + accesibles por rol)
- [x] Editar torneo (PATCH)
- [x] Grupos de torneo (round-robin por grupo)
- [x] Sede única opcional
- [x] Orden manual de clasificación (Pro, standings_order)
- [x] Suspender / reanudar / eliminar torneo

### 1.3 Equipos
- [x] Crear equipo desde torneo
- [x] Invitar dueño por email
- [x] Registro por invitación
- [x] Agregar jugadores (datos extendidos: nombre, categoría, documento de identidad, datos del padre/madre/encargado: nombre, parentesco, cédula, teléfono, correo; documentos y foto)
- [x] Editar jugadores (PATCH; admin equipo o admin torneo)
- [x] Asignar categoría de edad al jugador
- [x] Mis equipos (HomePage con filtro por torneo)
- [x] Logo de equipo (Pro; subida a Cloudinary o disco)
- [x] Sedes por equipo (team_venues): agregar, editar nombre/tipo (oficial/alterna), eliminar; el **admin del torneo** puede gestionar sedes de cualquier equipo

### 1.4 Partidos y calendario
- [x] CRUD de partidos (crear manual, editar fecha, editar resultado)
- [x] Generación de calendario round-robin (todos o por grupos)
- [x] Partidos suspendidos y reposiciones
- [x] Eventos de partido (goles, tarjetas) y estadísticas por deporte
- [x] Multas (match_penalties)
- [x] Sede por partido (o sede única del torneo)

### 1.5 Clasificación (standings)
- [x] `GET /tournaments/:id/standings` (tabla general + por grupos cuando hay grupos)
- [x] Tabla general y tablas por grupo con misma estructura (Pos, Grupo, Equipo, PJ, PG, PE, PP, GF, GC, DG, Pts)
- [x] Reorden manual de filas (Pro) en tabla general y en cada tabla de grupo
- [x] Escudos de equipos en tablas (Pro; si no hay logo, imagen por defecto)

### 1.6 Funciones Pro
- [x] Logo del torneo y personalización de página pública (colores, fondo, orden de secciones)
- [x] Generar reporte PDF por rango de fechas (estadísticas, goleadores, tarjetas, multas)
- [x] Escudos de equipos en calendario y tabla de posiciones
- [x] Reorden manual de la clasificación
- [x] Añadir partido manual (reposiciones / administrativos)
- [x] Página pública no Pro: solo información del torneo y tabla de posiciones

### 1.7 UI compartida
- [x] AppBar unificado (logo, título, idioma, usuario, logout)
- [x] i18n (ES/EN)
- [x] Footer básico
- [x] Date/datetime pickers con zona horaria local (UTC del navegador)

---

## 2. Orden sugerido de desarrollo

### Fase 1: Completar lo existente (prioridad alta)

| # | Sección | Tarea | API | Web | Notas |
|---|---------|-------|-----|-----|-------|
| 1.1 | **Calendario / Partidos** | Modelo y CRUD de partidos (fixtures) | ✅ Migración, GET/POST/PATCH/DELETE matches | ✅ Lista, crear manual, generar, editar fecha y resultado | Incluye eventos, estadísticas, multas |
| 1.2 | **Resultados** | Actualizar resultado de partido | ✅ `PATCH /matches/:id` (homeScore, awayScore, events, penalties) | ✅ Formulario en detalle de torneo | Incluye goleadores y tarjetas |
| 1.3 | **Clasificación** | Calcular tabla de posiciones | ✅ `GET /tournaments/:id/standings` (general + byGroup) | ✅ Tabla general + tablas por grupo, reorden Pro | Requiere 1.1, 1.2 |
| 1.4 | **Editar torneo** | Modificar torneo existente | ✅ `PATCH /tournaments/:id` | ✅ Modal "Editar torneo" | Solo admin del torneo |
| 1.5 | **Editar equipo** | Modificar nombre/descripción | Pendiente `PATCH /teams/:id` | Pendiente | Solo dueño o admin torneo |
| 1.6 | **Editar jugador** | Modificar jugador | ✅ `PATCH /teams/:id/players/:playerId` | ✅ Formulario en TeamDetailPage | Admin equipo o admin torneo |

### Fase 2: Funcionalidad core (prioridad media)

| # | Sección | Tarea | API | Web | Notas |
|---|---------|-------|-----|-----|-------|
| 2.1 | **Generación de calendario** | Crear partidos automáticamente | ✅ Round-robin (todos o por grupos) | ✅ Botón "Generar calendario" en torneo | Depende de 1.1 |
| 2.2 | **Formato de torneo** | Definir formato (round-robin, grupos+playoff, eliminatoria) | Parcial (grupos round-robin) | Selector en crear/editar torneo | Playoff y eliminatoria pendientes |
| 2.3 | **Dashboard del torneo** | Vista resumida para admin | Reutilizar endpoints existentes | Página `/tournaments/:id/admin` con métricas | Partidos, equipos, próximos partidos |
| 2.4 | **Perfil de usuario** | Ver/editar perfil | ✅ `GET /auth/me`, `PATCH /auth/me` | ✅ Página `/profile` | Nombre editable; cambio de contraseña vía “Olvidé contraseña” |
| 2.5 | **Recuperar contraseña** | Reset por email | ✅ `POST /auth/forgot-password`, `POST /auth/reset-password` | ✅ `/forgot-password`, `/reset-password?token=...` | Token en correo, expira 1 h |

### Fase 3: Mejoras y expansión (prioridad media-baja)

| # | Sección | Tarea | API | Web | Notas |
|---|---------|-------|-----|-----|-------|
| 3.1 | **Búsqueda y filtros** | Filtrar torneos por deporte, fecha, ubicación | Query params en `GET /tournaments` | Filtros en HomePage | Mejora UX |
| 3.2 | **Paginación** | Paginar listados | `?page=1&limit=20` en listados | Componente de paginación | Escalabilidad |
| 3.3 | **Notificaciones** | Alertas de invitación, partidos, resultados | Ya existe email de invitación; ampliar | Badge en AppBar, lista de notificaciones | Opcional: in-app + email |
| 3.4 | **Exportar datos** | Exportar clasificación, calendario | Parcial: reporte PDF (Pro) | Botón "Generar reporte PDF" (Pro) | CSV/Excel pendiente |
| 3.5 | **Área de administración** | Panel para system_admin | `GET /users`, gestión de roles | `/admin` protegido por rol | Usuarios, torneos globales |

### Fase 4: Funciones avanzadas (prioridad baja / roadmap)

| # | Sección | Tarea | API | Web | Notas |
|---|---------|-------|-----|-----|-------|
| 4.1 | **Pagos** | Inscripción con pago | Integración Stripe | Checkout en registro | Requiere Stripe |
| 4.2 | **Mensajería** | Chat entre equipos / organizadores | WebSockets o polling, modelo `messages` | Centro de mensajes | Complejidad alta |
| 4.3 | **Gestión de sedes** | Venues con disponibilidad | Modelo `venues`, `availability` | CRUD sedes, asignación a partidos | Similar a SyncedSport |
| 4.4 | **App móvil** | PWA o app nativa | Reutilizar API | PWA con service worker | Mejora acceso móvil |
| 4.5 | **Estadísticas de jugadores** | Goles, asistencias, etc. | Parcial: eventos en partido | Tabla goleadores/tarjetas en torneo | Detalle por jugador pendiente |

---

## 3. Secciones sugeridas (comparando con sitios similares)

### 3.1 Lo que tienen plataformas similares y LigaMatch

LigaMatch se enfoca en **fútbol** y **fútbol sala**.

| Sección | LeagueApps | PlayHQ | TeamSnap | LigaMatch |
|---------|------------|--------|----------|-----------|
| Calendario de partidos | ✓ | ✓ | ✓ | ✓ |
| Resultados y clasificación | ✓ | ✓ | ✓ | ✓ |
| Generación automática de calendario | ✓ | ✓ | ✓ | ✓ |
| Reportes / exportar | ✓ | ✓ | ✓ | ✓ (PDF Pro) |
| Pagos / inscripción con pago | ✓ | ✓ | ✓ | ❌ |
| Recuperar contraseña | ✓ | ✓ | ✓ | ✓ |
| Perfil de usuario | ✓ | ✓ | ✓ | ✓ |
| Notificaciones (email/SMS) | ✓ | ✓ | ✓ | ⚠️ Solo invitación |
| Gestión de sedes/venues | ✓ | ✓ | ✓ | ✓ Sedes por equipo; admin torneo puede agregar/editar/eliminar sedes de cualquier equipo |
| App móvil | ✓ | ✓ | ✓ | ❌ |
| Estadísticas de jugadores | ✓ | ✓ | ✓ | ⚠️ Goleadores/tarjetas por torneo |

### 3.2 Secciones que conviene añadir (orden sugerido)

1. **Perfil y recuperar contraseña** – Mejora la experiencia de usuario.
2. **Edición de equipos/jugadores** – Completar CRUD básico (PATCH).
3. **Búsqueda y filtros** – Mejora la navegación cuando hay muchos torneos.
4. **Notificaciones** – Mantiene a los usuarios informados.
5. **Pagos** – Monetización y gestión de inscripciones.
6. **Gestión de sedes** – Útil para torneos con varios campos.
7. **Estadísticas por jugador** – Valor añadido para ligas más serias.

---

## 4. Checklist por sección (para marcar avance)

### Partidos (Matches)
- [x] Migración `matches` (tournamentId, homeTeamId, awayTeamId, scheduledAt, homeScore, awayScore, status, round, venueId, isManual, etc.)
- [x] Modelo `Match`
- [x] `GET /tournaments/:id/matches`
- [x] `POST /tournaments/:id/matches` (crear partido manual)
- [x] `POST /tournaments/:id/matches/generate` (generar round-robin 1 o 2 rondas, con o sin grupos)
- [x] `PATCH /matches/:id` (fecha, homeScore, awayScore, events, statistics, penalties)
- [x] `DELETE /tournaments/:id/matches` (eliminar todos para regenerar)
- [x] UI: lista de partidos en TournamentDetailPage
- [x] UI: formulario crear partido (admin, Pro)
- [x] UI: formulario editar resultado (admin), goleadores, tarjetas, multas, estadísticas
- [x] UI: generar calendario (por grupos o todos), editar fecha, sedes

### Clasificación (Standings)
- [x] `GET /tournaments/:id/standings` (general + standingsByGroup cuando hay grupos)
- [x] UI: tabla general y tablas por grupo (Pos, Grupo, Equipo, PJ, PG, PE, PP, GF, GC, DG, Pts)
- [x] Orden por puntos, diferencia de goles, goles a favor
- [x] Orden manual (Pro) en tabla general y en cada tabla de grupo (standings_order)
- [x] Escudos de equipos en tablas (Pro; default si no hay logo)

### Generación de calendario
- [x] Grupos en torneos (tournament_groups, tournament_teams.groupId)
- [x] Servicio generateSchedule (round-robin por grupo o único)
- [x] `POST /tournaments/:id/matches/generate`
- [x] UI: botón "Generar calendario" (modo todos o por grupos, número de grupos)

### Edición
- [x] `PATCH /tournaments/:id`
- [ ] `PATCH /teams/:id`
- [x] `PATCH /teams/:id/players/:playerId`
- [x] UI: modal Editar torneo
- [ ] UI: editar equipo
- [x] UI: editar jugador (TeamDetailPage: nombre, categoría, documentos, datos encargado, foto)

### Perfil y auth
- [x] `GET /auth/me`
- [x] `PATCH /auth/me` (actualizar nombre)
- [x] `POST /auth/forgot-password`
- [x] `POST /auth/reset-password`
- [x] Página `/profile`
- [x] Página "Olvidé mi contraseña" (`/forgot-password`) y "Restablecer" (`/reset-password?token=...`)

### Búsqueda y filtros
- [ ] Query params en `GET /tournaments` (sport, from, to, location, q)
- [ ] UI: filtros en HomePage

---

## 5. Rutas actuales y propuestas

### Actuales
```
/                     → HomePage
/login                → LoginPage
/register             → RegisterPage
/create-tournament    → CreateTournamentPage
/tournaments/:slugOrId → TournamentDetailPage (admin + vista pública)
/teams/:id            → TeamDetailPage
```

### Propuestas (orden de implementación)
```
/profile               → ProfilePage
/tournaments/:id/admin  → TournamentAdminPage (dashboard)
/forgot-password       → ForgotPasswordPage
/reset-password?token=  → ResetPasswordPage
/admin                 → AdminPage (system_admin)
```

---

## 6. Modelos de datos actuales (resumen)

- **users** – id, email, passwordHash, name, plan (free/pro), createdAt
- **roles** – id, name
- **user_roles** – userId, roleId
- **tournaments** – id, slug, sport, categoryType, tournamentType, name, description, startDate, endDate, location, logoUrl, isPublic, publicPageColors, status, isSingleVenue, venueName, standings_order (jsonb), createdAt
- **tournament_admins** – userId, tournamentId
- **tournament_age_categories** – id, tournamentId, name, minBirthYear, maxBirthYear
- **tournament_groups** – id, tournamentId, name
- **teams** – id, tournamentId (origen), name, description, ownerEmail, logo_url, sport, createdAt
- **tournament_teams** – tournamentId, teamId, groupId (many-to-many + grupo)
- **team_members** – teamId, userId, isAdmin
- **team_invitations** – id, teamId, email, token, expiresAt
- **players** – id, teamId, name, birthYear, tournamentAgeCategoryId, firstName, lastName, birthDate, idDocumentType, idDocumentNumber, guardianName, guardianRelation, guardianIdNumber, guardianPhone, guardianEmail, photoUrl, createdAt
- **player_documents** – id, playerId, documentType (player_id_copy, birth_certificate, guardian_id_copy), fileUrl, fileName, mimeType
- **team_venues** – id, teamId, name, isOfficial, sortOrder
- **matches** – id, tournamentId, groupId, homeTeamId, awayTeamId, round, scheduledAt, homeScore, awayScore, status, venueId, suspendedMatchId, isManual, statistics (jsonb), match_events, match_extra_points, match_penalties, createdAt
- **match_events** – id, matchId, type, teamSide, playerId, playerName, minute, ownGoal
- **match_penalties** – id, matchId, type, targetId, targetName, description, amount, currency

### Otros modelos existentes
- **notifications** – id, userId, type, payload, readAt (notificaciones in-app)
- **player_change_requests** – solicitudes de agregar/editar/eliminar jugadores (flujo de aprobación cuando el usuario no es admin del torneo)

### Modelos a añadir (opcional)
- **venues** (global o por torneo) – id, name, address

---

## 7. Próximos pasos inmediatos

1. ~~**Perfil de usuario**~~ – Implementado: `GET/PATCH /auth/me`, página `/profile`.
2. ~~**Recuperar contraseña**~~ – Implementado: `/forgot-password`, `/reset-password`, token 1 h.
3. ~~**Editar jugador**~~ – Implementado: `PATCH /teams/:id/players/:playerId`, UI en TeamDetailPage (datos, encargado, documentos, foto).
4. **Editar equipo** – `PATCH /teams/:id` (nombre, descripción), UI en detalle del equipo.
5. **Búsqueda y filtros** – Query params en `GET /tournaments`, filtros en HomePage.
6. **Subir logo de equipo** – Ya existe columna y flujo de upload; documentar en README/STORAGE si aplica Cloudinary para logos de equipo.

Seguir este orden cierra el CRUD de equipos (falta solo PATCH equipo) y mejora la navegación (filtros de torneos).
