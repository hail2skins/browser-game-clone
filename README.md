# Tribal Wars Clone - Phase 1

## Structure
- `api/` - .NET Web API + EF Core + JWT auth
- `client/` - Vite + TypeScript + Phaser + Tailwind UI shell

## Local Run

### API
```bash
cd api
cp .env.example .env # adjust DB/JWT values
# export env vars from .env or set in your shell
DOTNET_ENVIRONMENT=Development dotnet run
```

### Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Migrations
```bash
cd api
dotnet tool restore
dotnet tool run dotnet-ef migrations add <Name>
dotnet tool run dotnet-ef database update
```

## Seed / First Admin
1. First user to register becomes `IsAdmin=true` and `IsApproved=true`.
2. Create invite via admin endpoint.
3. New users register with invite code and await approval.

## Core Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/admin/invites` (admin)
- `GET /api/admin/pending-users` (admin)
- `PATCH /api/admin/users/{id}/approval` (admin)
- `GET /api/game/shell`

## Railway
Create two Railway services from this repo:
- service 1: `api/` (Dockerfile)
- service 2: `client/` (Dockerfile)
Set environment variables from `api/.env.example` and `client/.env.example`.
