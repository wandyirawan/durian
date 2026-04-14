# 🥭 Durian

> "Spiky on the outside, sweet on the inside. Modern IAM server."

[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![Elysia](https://img.shields.io/badge/Elysia-%23fe5c28.svg?style=for-the-badge&logo=elysia&logoColor=white)](https://elysiajs.com)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Valkey](https://img.shields.io/badge/Valkey-%23DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://valkey.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A high-performance, modular Identity and Access Management (IAM) server built for modern applications. Secure by default, blazingly fast, and developer-friendly.

[Features](#features) • [Quick Start](#quick-start) • [API Documentation](#api-documentation) • [Architecture](#architecture) • [Roadmap](#roadmap) • [License](#license)

---

## ✨ Features

### 🔐 Authentication & Security
- **JWT RS256** - Asymmetric key signing with JWKS endpoint
- **Refresh Token Rotation** - Secure token lifecycle with automatic rotation
- **Password Hashing** - Bun native `Bun.password.hash()` (Argon2id)
- **Token Revocation** - Blacklist support with 15-minute TTL
- **Role-Based Access Control (RBAC)** - Admin and user roles

### ⚡ Performance
- **Bun Runtime** - 3x faster than Node.js, built-in TypeScript support
- **Elysia Framework** - Type-safe, Eden Treaty compatible, ~18x faster than Express
- **Valkey/Redis** - In-memory session storage with automatic failover to memory
- **Cluster Mode** - Multi-worker process support for production scale

### 🛠 Developer Experience
- **Auto-Generated API Docs** - Swagger UI available at `/api/swagger`
- **Type Safety** - End-to-end TypeScript with runtime validation
- **Modular Architecture** - Clean separation of concerns (auth, user, health modules)
- **Drizzle ORM** - Type-safe SQL with SQLite

### 📊 Observability
- **Health Checks** - `/health/live`, `/health/ready`, `/health/metrics`
- **Graceful Shutdown** - SIGTERM/SIGINT handling
- **Connection Fallback** - Automatic fallback when Valkey unavailable

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) >= 1.0
- Valkey (optional, has in-memory fallback)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/durian.git
cd durian

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env with your RSA keys and settings

# Start Valkey (optional)
sudo systemctl enable --now valkey

# Run development server
bun run --watch index.ts
```

### Environment Setup

Generate RSA keys for JWT signing:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# Convert to single line for .env
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0}' private.pem
```

### Verify Installation

```bash
# Server should start with:
# ✅ Valkey connected
# Worker PID at http://localhost:3000/api

# Test health endpoint
curl http://localhost:3000/api/health/live
```

---

## 📚 API Documentation

Durian auto-generates Swagger documentation. Once running, visit:

```
http://localhost:3000/api/swagger
```

### Authentication Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/auth/register` | POST | Create new account | Public |
| `/auth/login` | POST | Authenticate & get tokens | Public |
| `/auth/refresh` | POST | Get new access token | Public |
| `/auth/logout` | POST | Revoke refresh token | Public |
| `/auth/userinfo` | GET | Get current user info | Bearer |

### User Management Endpoints

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `POST /users/` | POST | Create new user | Public |
| `GET /users/:id` | GET | Get user by ID | Admin or own user |
| `GET /users/` | GET | List all users | **Admin only** |
| `DELETE /users/:id` | DELETE | Delete user | **Admin only** |
| `GET /users/me` | GET | Get current profile | Bearer |
| `PATCH /users/me` | PATCH | Update current profile | Bearer |
| `DELETE /users/me` | DELETE | Deactivate account | Bearer |

#### Access Control Matrix

| Endpoint | Admin | User | Notes |
|----------|-------|------|-------|
| `POST /users/` | ✅ | ✅ | Public registration |
| `GET /users/:id` | ✅ (any) | ✅ (own only) | Admin can view any user |
| `GET /users/` | ✅ | ❌ | Admin only |
| `DELETE /users/:id` | ✅ | ❌ | Admin only |
| `GET /users/me` | ✅ | ✅ | Self profile |
| `PATCH /users/me` | ✅ | ✅ | Self update |
| `DELETE /users/me` | ✅ | ✅ | Self deactivate |

### Health & Monitoring

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/health/live` | GET | Liveness probe | Public |
| `/health/ready` | GET | Readiness probe + DB check | Public |
| `/health/metrics` | GET | Runtime metrics | Public |

---

## 🏗 Architecture

### Tech Stack

```
┌─────────────────┐
│   Elysia.js   │  ← Web framework (type-safe, fast)
├─────────────────┤
│      Bun        │  ← Runtime (3x faster than Node)
├─────────────────┤
│  Drizzle ORM    │  ← Database toolkit
├─────────────────┤
│     SQLite      │  ← Persistent storage
├─────────────────┤
│  Valkey/Redis   │  ← Session cache (TTL support)
└─────────────────┘
```

### Project Structure

```
durian/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication (JWT, login, register)
│   │   ├── user/          # User management (CRUD, profile)
│   │   └── health/        # Health checks & metrics
│   ├── db/
│   │   ├── index.ts       # Drizzle connection
│   │   ├── schema.ts      # Database schema
│   │   └── valkey.ts      # Valkey client
│   └── modules/
├── server.ts              # Elysia app configuration
├── index.ts               # Entry point (cluster mode)
└── drizzle.config.ts      # Migration config
```

### Module Pattern

Each module follows **Service-Model-Route** pattern:

```typescript
// service.ts - Business logic
export const AuthService = {
  async signIn(credentials) { ... },
  async generateTokens(user) { ... },
}

// model.ts - TypeBox validation schemas
export const AuthModel = {
  signInBody: t.Object({ ... }),
}

// index.ts - Route definitions
export const authModule = new Elysia({ prefix: "/auth" })
  .post("/login", ({ body }) => AuthService.signIn(body), {
    body: AuthModel.signInBody
  })
```

---

## 🛣 Roadmap

### ✅ Milestone 1: Core IAM (Completed)
- [x] User registration & login
- [x] JWT RS256 implementation
- [x] Refresh token rotation
- [x] Role-based access control (user, admin)
- [x] Valkey integration with fallback
- [x] Auto-generated Swagger docs
- [x] Health checks (live/ready/metrics)
- [x] Cluster mode support

### 🚧 Milestone 2: Security Hardening (Next)
- [ ] Rate limiting (prevent brute force)
- [ ] IP blocking for failed attempts
- [ ] Audit logging (track all auth events)
- [ ] Security headers (CORS, CSP, HSTS)
- [ ] Request ID tracing
- [ ] Input sanitization middleware

### ✅ Milestone 3: Admin Features (Completed)
- [x] List all users endpoint (admin only)
- [x] Delete user endpoint (admin only)
- [ ] Change user role endpoint (admin)
- [ ] Admin dashboard (future)

### 📋 Milestone 4: User Features
- [ ] Password reset (forgot password)
- [ ] Change password endpoint
- [ ] Email verification
- [ ] User profile avatar upload
- [ ] Session management (view active sessions)

### 📋 Milestone 5: Advanced
- [ ] OAuth2/OIDC provider support
- [ ] MFA/TOTP support
- [ ] Social login (Google, GitHub)
- [ ] Webhook notifications
- [ ] Database migration system
- [ ] Docker & Docker Compose setup

---

## 🤔 Why Bun + Elysia?

### Bun: All-in-One JavaScript Runtime
- **Built-in TypeScript** - No ts-node or transpilation needed
- **Native Test Runner** - `bun test` built-in
- **Package Manager** - `bun install` 20x faster than npm
- **Bundler** - Built-in bundler & transpiler
- **Password API** - Native `Bun.password.hash()` with Argon2id
- **SQLite** - Native `bun:sqlite` module

### Elysia: Type-Safe Web Framework
- **Performance** - ~18x faster than Express
- **Type Safety** - End-to-end types from request to response
- **Eden Treaty** - Type-safe API client generation
- **Validation** - Built-in TypeBox validation
- **Swagger** - Auto-generated docs from type definitions
- **Middleware** - Composeable, type-safe middleware

### Compared to Traditional Stack

| Feature | Express + Node | Durian (Bun + Elysia) |
|---------|---------------|----------------------|
| TypeScript | Requires ts-node | Native |
| Validation | Manual or external | Built-in TypeBox |
| Documentation | Manual Swagger | Auto-generated |
| Performance | ~30k req/s | ~500k+ req/s |
| Bundle Size | Multiple deps | Single runtime |

---

## 📝 License

Durian is [MIT Licensed](LICENSE). Free for personal and commercial use.

---

## 🙏 Acknowledgments

- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Elysia](https://elysiajs.com) - Ergonomic web framework
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe SQL
- [Valkey](https://valkey.io) - Open source Redis alternative
- [Jose](https://github.com/panva/jose) - JWT library

---

<p align="center">
  <strong>Built with ❤️ and 🥭 Durian</strong>
</p>
