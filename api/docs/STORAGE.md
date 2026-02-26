# Almacenamiento de archivos e imágenes

## Cloudinary (recomendado para imágenes)

Cuando está configurado, **todas las imágenes** se suben a Cloudinary y se guarda solo la URL en la base de datos.

- **Variable de entorno:** `CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name`
- **Dónde se usa:** logo del torneo, imagen de fondo de la página pública del torneo, foto del jugador y documentos que sean imágenes (cédula, etc.).
- **Endpoints:** los uploads de imagen (tournament logo/bg, player photo) envían la imagen al API; el servidor la sube a Cloudinary y devuelve la URL.

Si `CLOUDINARY_URL` no está definido:
- **Logo e imagen de fondo del torneo:** los endpoints `POST /tournaments/:id/upload-logo` y `upload-background` devuelven error (se requiere Cloudinary).
- **Fotos y documentos de jugadores:** se guardan en disco en `uploads/players/` (o `UPLOAD_DIR`).

### Cloudinary – referencia
- **Soporta:** imágenes; PDF y otros archivos en planes superiores.
- **Plan gratuito:** 25 créditos/mes; para entregar PDF en plan free hay que activar "Allow delivery of PDF" en la cuenta.
- **Uso:** [Node SDK](https://cloudinary.com/documentation/node_integration), `cloudinary.config()` lee `CLOUDINARY_URL`.

### AWS S3
- Almacena en un bucket; genera URLs firmadas o sirve vía CloudFront.
- Requiere implementar en `uploadService` la subida a S3 (SDK `@aws-sdk/client-s3`) y devolver la URL pública o firmada.

### UploadThing
- Subidas desde el cliente sin pasar por tu API; sin coste de egress.
- Útil si prefieres que el navegador suba directo al proveedor.

## Tipos de archivo permitidos

- **Foto del jugador:** JPEG, PNG, GIF, WebP.
- **Documentos (cédula, partida de nacimiento, etc.):** PDF, Word (.doc, .docx), JPEG, PNG, GIF, WebP.
