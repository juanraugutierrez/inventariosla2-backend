
# Backend (Express + Prisma + MariaDB)

Este proyecto te da un backend listo para desarrollo con:
- **Express** (API REST)
- **Prisma** conectado a **MariaDB**
- **Autenticación JWT** y **roles**
- **CRUD dinámico** para **todas las tablas** (todos los modelos que Prisma detecte)
- Seguridad básica: CORS, Helmet, logging con Morgan

> Ruta sugerida en Windows: `C:\paso\inventariosla2\backend`

---

## 1) Requisitos

- Node.js 18+
- Base de datos MariaDB accesible (host, puerto, usuario, pass, database)

## 2) Instalación rápida

En PowerShell:

```ps1
# ve a la carpeta del frontend y crea 'backend' al lado
cd C:\paso\inventariosla2
mkdir backend
# descarga y descomprime el zip que te entregué en esta conversación dentro de .\backend
# luego:
cd .\backend

# instala deps
npm i

# inicializa Prisma (crea prisma/.env y schema.prisma)
npx prisma init

# edita .env y define DATABASE_URL (ejemplo abajo)
# extra: define variables de AUTH (ver sección Configuración)

# si YA tienes BD con tablas existentes, trae el esquema
npm run prisma:pull

# ejecuta en desarrollo
npm run dev
```

## 3) Configuración (.env)

Ejemplo de **DATABASE_URL** (ajústalo a tu servidor MariaDB):

```
DATABASE_URL="mysql://usuario:password@localhost:3306/mi_base?schema=public"
JWT_SECRET="cambia_esto_por_un_secreto_muy_largo"
PORT=4000

# Mapea tu tabla de usuarios para auth (después de 'prisma db pull')
# Nombre del modelo exactamente como aparece en Prisma schema (respetando mayúsculas/minúsculas)
AUTH_USER_MODEL="User"
AUTH_USER_EMAIL_FIELD="email"
AUTH_USER_PASSWORD_FIELD="passwordHash"
# Usa uno de estos dos esquemas de roles (elige 1):
# 1) Rol directo en la tabla de usuarios:
AUTH_USER_ROLE_FIELD="role"         # ej. 'admin' | 'editor' | 'viewer'

# 2) Relación muchos-a-muchos User <-> Role (opcional):
# AUTH_ROLE_MODEL="Role"
# AUTH_ROLE_NAME_FIELD="name"       # ej. 'admin', 'editor', 'viewer'
# AUTH_USER_ROLES_RELATION="roles"  # nombre del campo relación en el modelo User
```

> Si no tienes usuarios/roles, puedes crear tablas nuevas con Prisma Migrate (no incluido por defecto para no alterar tu BD sin querer). Pídeme scripts si los necesitas.

## 4) Cómo funciona el CRUD dinámico

- Luego de `npm run prisma:pull` y `prisma generate`, el cliente de Prisma expone un *delegate* por cada **modelo**.
- Este backend crea rutas dinámicas: `GET/POST/PUT/DELETE /api/:model` y `/api/:model/:id`.
- Por defecto asume **clave primaria** llamada `id`. Si tu PK tiene otro nombre, puedes usar los endpoints con filtros via `?where=...` (ver abajo) o adaptarlo.

### Endpoints
- `GET /api/:model` — lista (soporta `?where={...}&include={...}&select={...}&orderBy={...}&skip=0&take=50`)
- `GET /api/:model/:id` — detalle por `id`
- `POST /api/:model` — crea (body JSON con `data` o plano)
- `PUT /api/:model/:id` — actualiza por `id`
- `DELETE /api/:model/:id` — borra por `id`

> Todos requieren **JWT** excepto `/auth/login` y `/auth/register` (configurable).

## 5) Roles
- `admin`: acceso completo (CRUD de todos los modelos)
- `editor`: crear/editar/leer, no borrar (por defecto)
- `viewer`: solo lectura (por defecto)

Puedes ajustar reglas en `src/utils/permissions.js`.

## 6) Scripts útiles

```bash
npm run prisma:pull     # introspección de tu BD y generación de cliente
npm run prisma:studio   # UI para ver/editar datos
npm run dev             # modo desarrollo con recarga
npm start               # producción (sin recarga)
```

---

## Notas
- Rutas públicas: `/health`, `/auth/login`, `/auth/register` (puedes cambiarlo).
- Para modelos sin campo `id`, usa `GET /api/Modelo?where={"campoUnico":"valor"}` o adapta `pkFieldFor()` en `crudRouter.js`.
- Este scaffold evita hacer migraciones automáticamente para no tocar tu BD.
