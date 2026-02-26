# Recomendaciones de hosting – LigaMatch

Resumen del stack para elegir hosting:

| Componente | Tecnología | Requisitos |
|------------|------------|------------|
| **API** | Node.js 22+, Hapi.js, TypeScript (tsx en runtime) | Puerto configurable, variables de entorno, persistencia |
| **Web** | React 18, Webpack → build estático (HTML/JS/CSS) | Servir archivos estáticos o CDN |
| **Base de datos** | PostgreSQL 16 | Conexión TCP, migraciones (Knex) |
| **Otros** | SMTP opcional (invitaciones), JWT_SECRET | Sin almacenamiento de archivos obligatorio (logos en BD o URLs) |

---

## 1. Opciones “todo en uno” (más simples)

Un solo proveedor para API + Web + PostgreSQL (o al menos API + DB), ideal para arrancar y MVPs.

### [Railway](https://railway.app)
- **Ventajas**: Node 22, PostgreSQL gestionado, deploys desde GitHub, variables de entorno, plan gratuito limitado, buena DX.
- **Idea**: Un “service” para la API (Node), otro para el front (static site desde carpeta `web/dist` o build en CI), y una base de datos PostgreSQL. Puedes usar el mismo repo con `railway.json` o Dockerfile.
- **Precio**: Free tier con límites; después pay-as-you-go. Muy adecuado para proyectos pequeños/medianos.

### [Render](https://render.com)
- **Ventajas**: Web Service (API Node), Static Site (frontend), PostgreSQL gestionado, deploys desde GitHub, SSL incluido.
- **Idea**: Crear Web Service para `api` (comando `npm run start` desde `api/` o con build script), Static Site apuntando a `web` con build command `npm run build` y publish directory `web/dist`. Base de datos PostgreSQL en el mismo dashboard.
- **Precio**: Plan free para web/API (con limitaciones y “spin down”), PostgreSQL de pago. Muy buena opción para empezar.

### [Fly.io](https://fly.io)
- **Ventajas**: Corre cerca del usuario, soporta Node y PostgreSQL (o Postgres externo). Necesitas definir un `Dockerfile` para la API (y opcionalmente para el front si lo sirves desde la API).
- **Idea**: Una app para la API (Dockerfile con Node 22, `tsx src/index.ts`), otra para el front como static assets o servir el front desde la API con `@hapi/inert`. Base de datos: Fly Postgres o Neon/Supabase.
- **Precio**: Free tier generoso; luego por uso. Buena opción si quieres más control y baja latencia.

### [Heroku](https://www.heroku.com)
- **Ventajas**: Clásico para Node + Postgres, add-ons, documentación amplia.
- **Inconvenientes**: Eliminación del plan gratuito; ahora todo es de pago. Sigue siendo válido si ya tienes cuenta o presupuesto.

---

## 2. Frontend y backend por separado

Servir el front como estático en un CDN y la API en un servicio Node. Base de datos gestionada aparte.

### Frontend (estático)
- **[Vercel](https://vercel.com)** – Deploy desde GitHub, build de `web` con `npm run build`, output `web/dist` (o la carpeta que use Webpack). SSL y CDN incluidos. Muy cómodo para React/Webpack.
- **[Netlify](https://www.netlify.com)** – Similar: conectar repo, build command, publish directory. Buen free tier.
- **[Cloudflare Pages](https://pages.cloudflare.com)** – Deploy estático o con “build” (incl. Node para el build). CDN global, free tier amplio.

### API (Node) + Base de datos
- **API**: Railway, Render o Fly.io (como en la sección anterior), configurando `DATABASE_URL` y `CORS_ORIGIN` (origen del front, p. ej. `https://tu-app.vercel.app`).
- **PostgreSQL gestionado** (si no usas el del mismo proveedor):
  - [Neon](https://neon.tech) – Serverless Postgres, free tier, buena opción con Railway/Render/Fly.
  - [Supabase](https://supabase.com) – Postgres + extras (auth, storage). Puedes usar solo Postgres para LigaMatch.
  - [PlanetScale](https://planetscale.com) – MySQL; no aplica aquí porque el proyecto usa PostgreSQL.

---

## 3. Control total (VPS)

Si prefieres un solo servidor donde instalar Node, Nginx (o Caddy) y PostgreSQL:

- **[DigitalOcean](https://www.digitalocean.com)** – Droplets, App Platform (PaaS) o Managed Databases (Postgres). Documentación y guías muy buenas.
- **[Hetzner](https://www.hetzner.com)** – Precios bajos en Europa, Cloud y servidores dedicados.
- **[Linode (Akamai)](https://www.linode.com)** – VPS sencillos, buena relación calidad/precio.
- **[Vultr](https://www.vultr.com)** – Varias regiones, VPS y opciones gestionadas.

En VPS típicamente: instalas Node 22, PostgreSQL, ejecutas migraciones, sirves la API con `pm2` o systemd, y el front con Nginx (o lo generas y lo sirves desde la API). Requiere más configuración (SSL con Let’s Encrypt, firewall, backups).

---

## 4. Resumen recomendado por etapa

| Objetivo | Recomendación |
|----------|----------------|
| **Probar en vivo rápido** | **Render** o **Railway**: API + Static Site + Postgres en el mismo sitio, deploy desde GitHub. |
| **Frontend muy rápido y global** | **Vercel** (front) + **Railway** o **Render** (API) + **Neon** (Postgres). |
| **Mínimo coste con free tier** | **Cloudflare Pages** (front) + **Railway** o **Render** (API) + **Neon** (Postgres). |
| **Máximo control y latencia** | **Fly.io** (API + opcionalmente front) con **Fly Postgres** o **Neon**. |
| **Un solo servidor, tú administras** | **DigitalOcean** o **Hetzner** VPS + Node + Nginx + PostgreSQL. |

---

## 5. Enlaces útiles

- [Railway – Deploy Node](https://docs.railway.app/guides/nodejs)
- [Render – Web Services & Static Sites](https://render.com/docs)
- [Fly.io – Node.js](https://fly.io/docs/languages-and-runtimes/node/)
- [Vercel – Build configuration](https://vercel.com/docs/build-step)
- [Neon – PostgreSQL](https://neon.tech/docs)
- [Supabase – Database](https://supabase.com/docs/guides/database)

---

## 6. Antes de desplegar

1. **Variables de entorno (API)**  
   Definir en el hosting: `DATABASE_URL`, `JWT_SECRET` (fuerte y único), `CORS_ORIGIN` (URL del frontend), y si usas correo: `SMTP_URL` o `SMTP_HOST`/`SMTP_PORT`.

2. **Build del frontend**  
   El front usa **`API_HOST`** como URL base de la API (ver `web/src/shared/api/client.ts` y `web/.env.example`). En producción hay que definir `API_HOST` en el entorno de *build* del frontend (p. ej. en Vercel/Render/Netlify: variable de entorno `API_HOST=https://tu-api.railway.app`) para que las peticiones vayan a tu API desplegada.

3. **Migraciones**  
   Ejecutar `npm run db:migrate` (desde `api/`) en el primer deploy o en un job de release (Railway/Render permiten “release command”).

4. **Node**  
   Asegurar que el host use Node 22 (o >=22.18.0 como indica el proyecto); en Railway/Render/Fly se suele elegir en la configuración o en un `Dockerfile`.

Si indicas qué tipo de opción prefieres (todo en uno, front/back separados o VPS), se puede bajar al detalle de pasos para ese proveedor (por ejemplo, “deploy en Render paso a paso”).
