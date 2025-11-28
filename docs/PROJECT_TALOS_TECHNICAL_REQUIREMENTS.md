# Project Talos — Technical Requirements Specification

> **Version:** 1.0  
> **Stack:** FastAPI | PostgreSQL | Redis | SQLAlchemy 2.0 | Docker  
> **Pattern:** Repository Pattern with Unit of Work

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Database Schema Requirements](#2-database-schema-requirements)
3. [Authentication System (The Citadel)](#3-authentication-system-the-citadel)
4. [Code Execution Engine (The Forge)](#4-code-execution-engine-the-forge)
5. [Nginx Gateway Configuration](#5-nginx-gateway-configuration)
6. [Docker Compose Architecture](#6-docker-compose-architecture)
7. [Implementation Checklist](#7-implementation-checklist)

---

## 1. Project Structure

```
talos/
├── docker-compose.yml
├── Dockerfile
├── nginx/
│   ├── nginx.conf
│   └── rate_limit.conf
├── src/
│   ├── main.py
│   ├── config/
│   │   ├── settings.py          # Pydantic Settings
│   │   └── constants.py
│   ├── core/
│   │   ├── security/
│   │   │   ├── jwt.py           # JWT encode/decode/verify
│   │   │   ├── oauth2.py        # OAuth 2.0 flows
│   │   │   ├── totp.py          # TOTP generation/verification
│   │   │   └── password.py      # Argon2 hashing
│   │   └── exceptions.py
│   ├── domain/
│   │   ├── entities/            # Domain models (not ORM)
│   │   └── interfaces/          # Abstract repository interfaces
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── models/          # SQLAlchemy ORM models
│   │   │   ├── repositories/    # Concrete repository implementations
│   │   │   ├── unit_of_work.py
│   │   │   └── session.py
│   │   ├── cache/
│   │   │   └── redis_client.py
│   │   └── execution/
│   │       ├── docker_executor.py
│   │       ├── sandbox.py
│   │       └── languages/       # Language-specific configs
│   ├── application/
│   │   ├── services/            # Business logic / use cases
│   │   └── schemas/             # Pydantic request/response
│   └── api/
│       ├── dependencies.py
│       ├── middleware/
│       └── routes/
│           ├── auth.py
│           ├── oauth.py
│           ├── execution.py
│           └── health.py
├── sandbox_images/              # Dockerfiles for execution containers
│   ├── python/Dockerfile
│   ├── javascript/Dockerfile
│   └── go/Dockerfile
└── tests/
```

---

## 2. Database Schema Requirements

### 2.1 Core Tables

#### `users`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Indexed |
| password_hash | VARCHAR(255) | NOT NULL | Argon2id |
| is_active | BOOLEAN | DEFAULT true | |
| is_verified | BOOLEAN | DEFAULT false | Email verification |
| mfa_enabled | BOOLEAN | DEFAULT false | |
| mfa_secret | VARCHAR(32) | NULLABLE | Encrypted TOTP secret |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | ON UPDATE | |

#### `refresh_tokens`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users | Indexed |
| token_hash | VARCHAR(64) | UNIQUE | SHA-256 of token |
| device_info | JSONB | NULLABLE | User-agent, IP |
| expires_at | TIMESTAMP | NOT NULL | |
| revoked_at | TIMESTAMP | NULLABLE | |
| created_at | TIMESTAMP | | |

#### `oauth_clients` (Talos as OAuth Provider)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| client_id | VARCHAR(64) | UNIQUE | Public identifier |
| client_secret_hash | VARCHAR(255) | | Hashed secret |
| name | VARCHAR(100) | | App name |
| redirect_uris | TEXT[] | | Allowed callbacks |
| scopes | TEXT[] | | Permitted scopes |
| grant_types | TEXT[] | | authorization_code, client_credentials |
| is_confidential | BOOLEAN | | Public vs confidential client |
| user_id | UUID | FK → users | Owner |
| created_at | TIMESTAMP | | |

#### `oauth_authorization_codes`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| code | VARCHAR(64) | PK | Short-lived (10 min) |
| client_id | UUID | FK → oauth_clients | |
| user_id | UUID | FK → users | |
| redirect_uri | TEXT | | Must match registered |
| scopes | TEXT[] | | Granted scopes |
| code_challenge | VARCHAR(128) | NULLABLE | PKCE S256 hash |
| expires_at | TIMESTAMP | | |
| used_at | TIMESTAMP | NULLABLE | One-time use |

#### `oauth_external_accounts` (Talos as OAuth Client)
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| provider | VARCHAR(50) | | github, google, etc. |
| provider_user_id | VARCHAR(255) | | External ID |
| access_token | TEXT | | Encrypted |
| refresh_token | TEXT | NULLABLE | Encrypted |
| token_expires_at | TIMESTAMP | NULLABLE | |
| profile_data | JSONB | | Cached profile |
| created_at | TIMESTAMP | | |
| UNIQUE | | (provider, provider_user_id) | |

#### `execution_jobs`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users, NULLABLE | Anonymous allowed? |
| language | VARCHAR(20) | NOT NULL | python, javascript, go |
| code | TEXT | NOT NULL | Max 64KB |
| stdin | TEXT | NULLABLE | Input data |
| status | VARCHAR(20) | | pending, running, completed, failed, timeout |
| stdout | TEXT | NULLABLE | Execution output |
| stderr | TEXT | NULLABLE | Error output |
| exit_code | INTEGER | NULLABLE | |
| execution_time_ms | INTEGER | NULLABLE | |
| memory_used_kb | INTEGER | NULLABLE | |
| created_at | TIMESTAMP | | |
| started_at | TIMESTAMP | NULLABLE | |
| completed_at | TIMESTAMP | NULLABLE | |

---

## 3. Authentication System (The Citadel)

### 3.1 JWT Implementation

#### Token Structure

**Access Token (Short-lived: 15 minutes)**
```
Header: { "alg": "RS256", "typ": "JWT", "kid": "<key-id>" }
Payload: {
  "sub": "<user-uuid>",
  "iat": <issued-at>,
  "exp": <expiration>,
  "type": "access",
  "jti": "<unique-token-id>",
  "scopes": ["read", "write", "execute"]
}
```

**Refresh Token (Long-lived: 7-30 days)**
```
Payload: {
  "sub": "<user-uuid>",
  "iat": <issued-at>,
  "exp": <expiration>,
  "type": "refresh",
  "jti": "<unique-token-id>",
  "family": "<token-family-uuid>"  # For rotation detection
}
```

#### Requirements

- [ ] **RS256 Signing**: Use RSA key pairs (minimum 2048-bit)
- [ ] **Key Rotation**: Support multiple active keys via `kid` header
- [ ] **Token Blacklisting**: Redis set for revoked `jti` values
- [ ] **Refresh Token Rotation**: Issue new refresh token on each use
- [ ] **Token Family Tracking**: Detect reuse of old refresh tokens (breach indicator)
- [ ] **Secure Storage**: Refresh tokens in HttpOnly, Secure, SameSite=Strict cookies
- [ ] **Fingerprinting**: Bind tokens to device fingerprint hash

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account (email + password) |
| POST | `/auth/login` | Authenticate, return tokens |
| POST | `/auth/logout` | Revoke current refresh token |
| POST | `/auth/logout-all` | Revoke all user sessions |
| POST | `/auth/refresh` | Exchange refresh for new access token |
| GET | `/auth/me` | Current user profile |

---

### 3.2 OAuth 2.0 Implementation

#### 3.2.1 Talos as OAuth Client (Login with GitHub/Google)

**Authorization Code Flow with PKCE**

```
1. User clicks "Login with GitHub"
2. Generate: state (CSRF), code_verifier, code_challenge = SHA256(verifier)
3. Store state + verifier in Redis (5 min TTL)
4. Redirect → GitHub authorize URL with code_challenge
5. GitHub redirects back with ?code=xxx&state=yyy
6. Validate state, exchange code + code_verifier for tokens
7. Fetch user profile from GitHub API
8. Create/link local user account
9. Issue Talos JWT tokens
```

**Requirements**

- [ ] **State Parameter**: Cryptographically random, 32 bytes
- [ ] **PKCE**: Always use S256 challenge method
- [ ] **Account Linking**: Allow multiple OAuth providers per user
- [ ] **Profile Sync**: Update cached profile on each login
- [ ] **Error Handling**: Map OAuth errors to user-friendly messages

#### 3.2.2 Talos as OAuth Provider

**Supported Grant Types**

1. **Authorization Code** (for web apps with backend)
2. **Authorization Code + PKCE** (for SPAs and mobile)
3. **Client Credentials** (for machine-to-machine)

**Requirements**

- [ ] **Client Registration**: Admin API to create OAuth clients
- [ ] **Consent Screen**: User approves requested scopes
- [ ] **Scope Enforcement**: Validate scopes on protected endpoints
- [ ] **Token Introspection**: Endpoint to validate tokens (RFC 7662)
- [ ] **Token Revocation**: Endpoint to revoke tokens (RFC 7009)

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/oauth/authorize` | Authorization endpoint (shows consent) |
| POST | `/oauth/token` | Token endpoint |
| POST | `/oauth/revoke` | Revoke token |
| POST | `/oauth/introspect` | Validate token |
| GET | `/oauth/userinfo` | Get user claims (OpenID Connect) |
| GET | `/.well-known/oauth-authorization-server` | Metadata |

---

### 3.3 MFA / TOTP Implementation

**TOTP Algorithm (RFC 6238)**
```
TOTP = HOTP(secret, floor(time / 30))
HOTP = Truncate(HMAC-SHA1(secret, counter))
```

**Requirements**

- [ ] **Secret Generation**: 160-bit random secret, Base32 encoded
- [ ] **QR Code Generation**: `otpauth://totp/Talos:{email}?secret={secret}&issuer=Talos`
- [ ] **Time Window**: Accept ±1 time step (90 second window)
- [ ] **Rate Limiting**: Max 5 failed attempts per 15 minutes
- [ ] **Backup Codes**: Generate 10 single-use recovery codes
- [ ] **Secret Encryption**: Encrypt at rest with application key
- [ ] **Setup Flow**: Require current password + valid TOTP to enable
- [ ] **Authenticator Apps**: Compatible with Google Authenticator, Authy, 1Password

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/mfa/setup/init` | Generate secret + QR URI |
| POST | `/auth/mfa/setup/verify` | Confirm setup with TOTP code |
| POST | `/auth/mfa/verify` | Verify TOTP during login |
| POST | `/auth/mfa/disable` | Disable MFA (requires TOTP) |
| GET | `/auth/mfa/backup-codes` | View backup codes |
| POST | `/auth/mfa/backup-codes/regenerate` | Generate new codes |

---

### 3.4 SSO Principles (Conceptual)

**Learning Focus**: Understand these concepts without full implementation

- [ ] **Session Federation**: How identity propagates across services
- [ ] **SAML 2.0**: XML-based assertions (understand flow, don't implement)
- [ ] **OpenID Connect**: OAuth 2.0 + identity layer (ID tokens)
- [ ] **ID Token Claims**: `sub`, `iss`, `aud`, `exp`, `iat`, `auth_time`
- [ ] **Single Logout**: Propagating logout across services

---

## 4. Code Execution Engine (The Forge)

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FastAPI                              │
│  POST /execute → validate → enqueue job → return job_id    │
│  GET /execute/{id} → poll status → return result           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  Job Queue  │
                    │  (Stream)   │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │     Worker Process      │
              │  (Background Task or    │
              │   Separate Service)     │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │    Docker Executor      │
              │  - Pull/create container│
              │  - Copy code to volume  │
              │  - Run with limits      │
              │  - Capture output       │
              │  - Cleanup              │
              └─────────────────────────┘
```

### 4.2 Sandbox Container Requirements

#### Base Image Specifications

**Python Sandbox**
```dockerfile
FROM python:3.12-slim-bookworm
RUN useradd -m -s /bin/false sandbox
WORKDIR /sandbox
USER sandbox
# No network, limited filesystem
```

**JavaScript Sandbox**
```dockerfile
FROM node:20-slim
RUN useradd -m -s /bin/false sandbox
WORKDIR /sandbox
USER sandbox
```

#### Resource Limits (Per Execution)

| Resource | Limit | Enforcement |
|----------|-------|-------------|
| CPU | 0.5 cores | `--cpus=0.5` |
| Memory | 128 MB | `--memory=128m --memory-swap=128m` |
| Execution Time | 10 seconds | Timeout in executor |
| Disk | 10 MB | `--storage-opt size=10m` (requires overlay2) |
| PIDs | 64 | `--pids-limit=64` |
| Network | None | `--network=none` |
| Filesystem | Read-only | `--read-only` + tmpfs for /tmp |

#### Security Requirements

- [ ] **No Privileged Mode**: Never use `--privileged`
- [ ] **Drop Capabilities**: `--cap-drop=ALL`
- [ ] **Seccomp Profile**: Restrict syscalls to minimal set
- [ ] **No New Privileges**: `--security-opt=no-new-privileges`
- [ ] **Read-Only Root**: `--read-only` with tmpfs mounts
- [ ] **Non-Root User**: Run as UID 1000 inside container
- [ ] **No Network**: Complete network isolation
- [ ] **Resource Cleanup**: Remove containers after execution
- [ ] **Image Pinning**: Use SHA256 digest, not tags

### 4.3 Execution Flow

```
1. Receive execution request
   - Validate language (whitelist)
   - Validate code size (max 64KB)
   - Validate stdin size (max 1MB)

2. Create job record (status: pending)
   - Generate job UUID
   - Store in PostgreSQL

3. Enqueue to Redis Stream
   - XADD execution_queue * job_id <uuid>

4. Worker picks up job
   - XREADGROUP with consumer group
   - Update status: running
   - Record started_at

5. Execute in sandbox
   a. Create temp directory
   b. Write code to file
   c. Write stdin to file (if provided)
   d. Run container with limits:
      docker run --rm \
        --network=none \
        --memory=128m \
        --cpus=0.5 \
        --pids-limit=64 \
        --read-only \
        --cap-drop=ALL \
        --security-opt=no-new-privileges \
        --tmpfs /tmp:size=10m \
        -v /path/to/code:/sandbox/code:ro \
        talos-sandbox-python \
        timeout 10 python /sandbox/code/main.py
   e. Capture stdout, stderr, exit code
   f. Record execution time

6. Store results
   - Update PostgreSQL with output
   - Update status: completed/failed/timeout
   - Record completed_at

7. Cleanup
   - Remove temp directory
   - ACK message in Redis stream
```

### 4.4 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/execute` | Submit code for execution |
| GET | `/execute/{job_id}` | Get job status/result |
| GET | `/execute/{job_id}/stream` | SSE for real-time status |
| GET | `/languages` | List supported languages |

**Request Schema (POST /execute)**
```json
{
  "language": "python",
  "code": "print('Hello, World!')",
  "stdin": "optional input",
  "timeout": 5
}
```

**Response Schema**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "language": "python",
  "stdout": "Hello, World!\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 45,
  "memory_used_kb": 8192,
  "created_at": "2025-01-15T10:00:00Z",
  "completed_at": "2025-01-15T10:00:00.045Z"
}
```

---

## 5. Nginx Gateway Configuration

### 5.1 Rate Limiting Requirements

```nginx
# /etc/nginx/conf.d/rate_limit.conf

# Define rate limit zones
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=execute_limit:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=20r/s;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
```

### 5.2 Location Blocks

```nginx
# Authentication endpoints - strict limiting
location /auth/ {
    limit_req zone=auth_limit burst=10 nodelay;
    limit_conn conn_limit 5;
    
    proxy_pass http://talos_api:8000;
    # ... proxy headers
}

# Code execution - very strict
location /execute {
    limit_req zone=execute_limit burst=5 nodelay;
    limit_conn conn_limit 2;
    
    # Larger timeout for execution
    proxy_read_timeout 30s;
    
    proxy_pass http://talos_api:8000;
}

# General API
location /api/ {
    limit_req zone=general_limit burst=30;
    proxy_pass http://talos_api:8000;
}
```

### 5.3 Security Headers

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

---

## 6. Docker Compose Architecture

```yaml
version: "3.8"

services:
  talos_api:
    build: .
    environment:
      - DATABASE_URL=postgresql+asyncpg://...
      - REDIS_URL=redis://redis:6379/0
      - JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private
      - JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro  # For container execution
      - execution_temp:/tmp/executions
    secrets:
      - jwt_private
      - jwt_public
      - totp_encryption_key
    depends_on:
      - postgres
      - redis
    networks:
      - talos_internal
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  talos_worker:
    build: .
    command: python -m src.worker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - execution_temp:/tmp/executions
    # ... same env and secrets
    networks:
      - talos_internal
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/rate_limit.conf:/etc/nginx/conf.d/rate_limit.conf:ro
    networks:
      - talos_internal
      - external

  # Assumes postgres and redis are in external network
  postgres:
    external: true
  
  redis:
    external: true

volumes:
  execution_temp:

networks:
  talos_internal:
    internal: true
  external:
    external: true

secrets:
  jwt_private:
    file: ./secrets/jwt_private.pem
  jwt_public:
    file: ./secrets/jwt_public.pem
  totp_encryption_key:
    file: ./secrets/totp_key
```

---

## 7. Implementation Checklist

### Phase 1: Foundation
- [ ] Project structure setup
- [ ] SQLAlchemy 2.0 async configuration
- [ ] Repository pattern base classes
- [ ] Unit of Work implementation
- [ ] Database migrations (Alembic)
- [ ] Redis connection management

### Phase 2: Basic Auth
- [ ] User model and repository
- [ ] Password hashing (Argon2id)
- [ ] JWT generation and validation
- [ ] Access/Refresh token flow
- [ ] Token refresh with rotation
- [ ] Token blacklisting

### Phase 3: Advanced Auth
- [ ] OAuth client (GitHub login)
- [ ] OAuth client (Google login)
- [ ] OAuth provider (authorization server)
- [ ] TOTP setup and verification
- [ ] Backup codes
- [ ] Account linking

### Phase 4: Execution Engine
- [ ] Sandbox Docker images
- [ ] Docker executor service
- [ ] Redis job queue
- [ ] Worker process
- [ ] Resource limiting
- [ ] Output capture

### Phase 5: Hardening
- [ ] Nginx rate limiting
- [ ] Request validation
- [ ] Error handling
- [ ] Logging and monitoring
- [ ] Security audit

---

## Appendix A: Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/talos

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_ALGORITHM=RS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private
JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public

# OAuth Providers (as client)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# TOTP
TOTP_ENCRYPTION_KEY_PATH=/run/secrets/totp_key
TOTP_ISSUER=Talos

# Execution
EXECUTION_TIMEOUT_SECONDS=10
EXECUTION_MEMORY_LIMIT_MB=128
EXECUTION_CPU_LIMIT=0.5
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

---

*Technical Specification v1.0 — Project Talos*
