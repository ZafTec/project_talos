# Project Talos — Authentication & Authorization Learning Guide

> **A structured learning path for mastering the security foundations of Project Talos**

---

## Overview

This guide provides a structured learning path for the key authentication and authorization protocols used in Project Talos. Each section includes specification summaries, official documents, and curated practical resources selected for clarity and hands-on applicability.

**Learning Philosophy**: Start with specs for theory, then tutorials for code. Use tools like Auth0/Okta sandboxes for labs.

---

## 1. JSON Web Tokens (JWT) — RFC 7519

### Specification Summary

RFC 7519 defines JSON Web Token (JWT) as a compact, URL-safe method for securely transmitting claims (e.g., user identity or permissions) between parties as a JSON object.

**Structure**: Three Base64url-encoded parts separated by dots:

| Part | Contents |
|------|----------|
| **Header** | JSON with `alg` (signing algorithm: HS256, RS256) and `typ: "JWT"` |
| **Payload** | Claims: `iss` (issuer), `sub` (subject), `aud` (audience), `exp` (expiration) |
| **Signature** | HMAC-SHA or RSA over `base64(header) + "." + base64(payload)` using secret key |

**Talos Usage**: Access tokens (RS256, 15 min), Refresh tokens (RS256, 7-30 days)

### Official Specification

- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)

### Practical Resources

| Resource | Description | Best For |
|----------|-------------|----------|
| [JWT.io Introduction](https://jwt.io/introduction) | Interactive debugger to encode/decode JWTs | Exploration, debugging |
| [freeCodeCamp JWT Handbook](https://www.freecodecamp.org/news/the-json-web-token-handbook-learn-to-use-jwts-for-web-authentication/) | Step-by-step Node.js/Express/MongoDB implementation | Hands-on tutorial |
| [JWT Security Enterprise Guide (Medium)](https://medium.com/@okanyildiz1994/jwt-security-complete-enterprise-implementation-guide-for-modern-applications-ac055e68ad89) | Code examples, diagrams, case studies | Production patterns |
| [Stytch Blog: RFC 7519 Explained](https://stytch.com/blog/rfc-7519-jwt-part-1/) | RFC breakdown with code snippets | Deep understanding |

### Key Implementation Points for Talos

- Use RS256 (asymmetric) over HS256 for key distribution flexibility
- Always validate `exp`, `iss`, `aud` claims
- Never store sensitive data in payload (it's only encoded, not encrypted)
- Implement key rotation via `kid` (Key ID) header

---

## 2. OAuth 2.0 — RFC 6749/6750

### Specification Summary

RFC 6749 outlines the OAuth 2.0 framework for delegating access without sharing credentials.

**Roles**:

| Role | Description |
|------|-------------|
| **Resource Owner** | The user granting access |
| **Client** | Application requesting access (Talos) |
| **Authorization Server (AS)** | Issues tokens (GitHub, Google, or Talos itself) |
| **Resource Server (RS)** | Validates tokens, serves protected resources |

**Grant Types**: Authorization Code (most secure), Implicit (deprecated), Client Credentials (machine-to-machine)

RFC 6750 details **Bearer Token Usage**: Present access tokens via `Authorization: Bearer <token>` header.

### Official Specifications

- [RFC 6749 - The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 6750 - Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)

### Authorization Code Flow Deep Dive

This is the recommended flow for server-side apps and what Talos will implement.

**Flow Steps**:

```
┌──────────┐                              ┌─────────────────┐
│  User    │                              │ Auth Server     │
│ (Browser)│                              │ (GitHub/Google) │
└────┬─────┘                              └────────┬────────┘
     │                                             │
     │  1. Click "Login with GitHub"               │
     ├────────────────────────────────────────────►│
     │     /authorize?client_id=...&               │
     │     response_type=code&scope=...&           │
     │     redirect_uri=...&state=...&             │
     │     code_challenge=...                      │
     │                                             │
     │  2. User authenticates & consents           │
     │◄────────────────────────────────────────────┤
     │                                             │
     │  3. Redirect back with code                 │
     │     /callback?code=xxx&state=yyy            │
     │                                             │
┌────▼─────┐                              ┌────────┴────────┐
│  Talos   │  4. Exchange code for token  │ Auth Server     │
│  Backend │  POST /token                 │                 │
│          │  {code, client_secret,       │                 │
│          │   code_verifier}             │                 │
│          ├─────────────────────────────►│                 │
│          │                              │                 │
│          │  5. Receive access_token     │                 │
│          │◄─────────────────────────────┤                 │
└──────────┘                              └─────────────────┘
```

**Security Checklist**:

| Step | Security Measure |
|------|------------------|
| Initiate | Validate `redirect_uri` against whitelist |
| Callback | Code valid ~10 min, single-use only |
| Exchange | Use PKCE: `code_challenge`/`code_verifier` |
| Ongoing | Rotate secrets, monitor for leaks |

### Practical Resources

| Resource | Description | Best For |
|----------|-------------|----------|
| [OAuth.net Overview](https://oauth.net/2/) | Protocol flows and client simplicity | Quick reference |
| [WorkOS Complete Guide](https://workos.com/guide/the-complete-guide-to-oauth) | RFCs, flows, bearer usage with diagrams | Comprehensive learning |
| [Microsoft Auth Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) | Implementation with PKCE, error handling | Production implementation |
| [Deep Technical Analysis (2025)](https://kane.mx/posts/2025/mcp-authorization-oauth-rfc-deep-dive/) | Modern flows and RFC integrations | Advanced patterns |

### Talos Implementation Notes

- **As Client**: Implement GitHub/Google login with PKCE
- **As Provider**: Support Authorization Code + PKCE and Client Credentials grants
- Always use `state` parameter to prevent CSRF
- Store tokens encrypted, never in localStorage

---

## 3. Time-Based One-Time Password (TOTP) — RFC 6238

### Specification Summary

RFC 6238 defines TOTP as a time-based variant of HOTP (RFC 4226), generating short-lived codes for MFA.

**Algorithm**:
```
TOTP = HOTP(K, C)
where:
  K = shared secret (Base32 encoded)
  C = floor(current_unix_time / time_step)  # Default: 30 seconds
  
HOTP(K, C) = Truncate(HMAC-SHA1(K, C)) mod 10^digits  # Default: 6 digits
```

**Parameters**:

| Parameter | Default | Notes |
|-----------|---------|-------|
| Secret (K) | — | 160-bit, Base32 encoded |
| Hash | SHA-1 | SHA-256/512 also supported |
| Digits | 6 | Can be 6-8 |
| Time Step | 30s | Period between code changes |

**Validation**: Server recomputes code, typically allows ±1 step window for clock drift (90 second window).

### Official Specification

- [RFC 6238 - TOTP: Time-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226 - HOTP: HMAC-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc4226) (foundation)

### Authenticator App Integration

Generate QR code with `otpauth://` URI for apps like Google Authenticator:

```
otpauth://totp/Talos:{user_email}
  ?secret={base32_secret}
  &issuer=Talos
  &algorithm=SHA1
  &digits=6
  &period=30
```

### Practical Resources

| Resource | Description | Best For |
|----------|-------------|----------|
| [Authgear: What is TOTP?](https://www.authgear.com/post/what-is-totp) | Algorithm breakdown with code examples | Understanding the math |
| [LoginRadius: TOTP Explained](https://www.loginradius.com/blog/engineering/what-is-totp-authentication) | Integration steps, why secure over SMS | Implementation guide |
| [Twilio Verify TOTP](https://www.twilio.com/docs/verify/quickstarts/totp) | Generate seed, QR, verify in apps | Quick start |
| [Medium: Understanding TOTP](https://medium.com/@MwangiKinyanjui/understanding-totp-and-authenticator-apps-from-a-developers-perspective-45148dbf75d9) | Shared secret handling, edge cases | Developer perspective |

### Talos Implementation Notes

- Generate cryptographically random 160-bit secrets
- Encrypt secrets at rest (never store plaintext)
- Generate 10 single-use backup codes during setup
- Rate limit verification attempts (5 per 15 min)
- Allow ±1 time step window for clock drift

---

## 4. Single Sign-On (SSO): SAML 2.0 & OpenID Connect

### SAML 2.0 Concepts Summary

SAML 2.0 (OASIS standard) enables federated identity via XML-based **assertions**.

**Key Elements**:

| Element | Description |
|---------|-------------|
| **Assertion** | Signed statement about a subject (user) |
| **Subject** | The entity being described |
| **Conditions** | Validity period, audience restrictions |
| **Statements** | AuthnStatement (login details), AttributeStatement (user data), AuthzDecisionStatement (access rulings) |

**SSO Flow** (Web Browser Profile):
1. User requests protected resource at Service Provider (SP)
2. SP redirects to Identity Provider (IdP) with AuthnRequest
3. User authenticates at IdP
4. IdP sends signed Assertion back to SP
5. SP validates assertion, creates session

### OpenID Connect Summary

OpenID Connect (OIDC) 1.0 extends OAuth 2.0 with an identity layer for authentication.

**Key Additions to OAuth 2.0**:

| Feature | Description |
|---------|-------------|
| `openid` scope | Required scope to indicate OIDC request |
| **ID Token** | JWT containing identity claims |
| **UserInfo Endpoint** | Returns user profile information |

**ID Token Claims**:
```json
{
  "iss": "https://accounts.google.com",
  "sub": "user-unique-id",
  "aud": "your-client-id",
  "exp": 1735689600,
  "iat": 1735686000,
  "auth_time": 1735685900,
  "nonce": "random-value-for-replay-prevention"
}
```

**Validation Checklist**:
- Verify signature against provider's public keys
- Check `iss` matches expected issuer
- Check `aud` contains your client ID
- Check `exp` is in the future
- Verify `nonce` matches what you sent (replay prevention)

### Official Specifications

- [OASIS SAML 2.0 Core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

### SAML vs OIDC Comparison

| Aspect | SAML 2.0 | OpenID Connect |
|--------|----------|----------------|
| Format | XML | JSON/JWT |
| Use Case | Enterprise SSO | Web/Mobile apps |
| Complexity | High | Lower |
| Token | Assertion (XML) | ID Token (JWT) |
| Transport | HTTP POST/Redirect | OAuth 2.0 flows |

### Practical Resources

| Resource | Description | Best For |
|----------|-------------|----------|
| [LoginRadius: SSO Guide](https://www.loginradius.com/blog/engineering/guide-to-openid-saml-oauth) | Differences, benefits, choice criteria | Comparison |
| [OpenID: How Connect Works](https://openid.net/developers/how-connect-works/) | Flow diagrams, ID Token validation | OIDC implementation |
| [Microsoft: SAML Protocol](https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol) | Requests/responses, error codes | SAML implementation |
| [OASIS SAML Technical Overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) | Assertion syntax/rules | Deep SAML understanding |
| [YouTube: SAML vs OIDC](https://www.youtube.com/watch?v=BrTzamVi3WQ) | Protocol choice breakdown | Visual learning |

### Talos Implementation Notes

- Focus on OIDC for Talos (simpler, JWT-based)
- Understand SAML conceptually for enterprise integrations
- When acting as OIDC Provider, implement ID Token generation
- Support standard scopes: `openid`, `profile`, `email`

---

## 5. Supplementary: Container Security Resources

While not part of authentication, these are essential for The Forge (execution engine).

| Resource | URL | Focus |
|----------|-----|-------|
| Docker Security Docs | https://docs.docker.com/engine/security/ | Official guide |
| Seccomp Profiles | https://docs.docker.com/engine/security/seccomp/ | Syscall filtering |
| gVisor | https://gvisor.dev/docs/ | Kernel-level sandbox |
| Docker SDK Python | https://docker-py.readthedocs.io | API for execution |

---

## 6. Recommended Learning Order

### Week 1-2: JWT Foundations
1. Read RFC 7519 (skim, focus on structure)
2. Play with JWT.io debugger
3. Follow freeCodeCamp tutorial
4. Implement basic JWT generation/validation in Python

### Week 3-4: OAuth 2.0 Client
1. Read RFC 6749 Sections 1-4 (core concepts)
2. Study Authorization Code Flow diagram
3. Implement GitHub OAuth login with PKCE
4. Add Google OAuth login

### Week 5-6: OAuth 2.0 Provider
1. Read RFC 6749 Sections 5-10 (token endpoints)
2. Implement authorization endpoint with consent screen
3. Implement token endpoint
4. Add client credentials grant

### Week 7: TOTP/MFA
1. Read RFC 6238 (short, math-focused)
2. Implement secret generation and QR code
3. Integrate with Google Authenticator
4. Add backup codes

### Week 8: SSO Concepts
1. Read OIDC Core Spec (skim)
2. Understand ID Token structure
3. Implement UserInfo endpoint
4. Study SAML conceptually (no implementation)

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    TALOS AUTH QUICK REF                     │
├─────────────────────────────────────────────────────────────┤
│ JWT Access Token                                            │
│   Algorithm: RS256                                          │
│   Lifetime: 15 minutes                                      │
│   Claims: sub, iat, exp, type, jti, scopes                 │
├─────────────────────────────────────────────────────────────┤
│ JWT Refresh Token                                           │
│   Algorithm: RS256                                          │
│   Lifetime: 7-30 days                                       │
│   Claims: sub, iat, exp, type, jti, family                 │
├─────────────────────────────────────────────────────────────┤
│ OAuth 2.0 (as Client)                                       │
│   Flow: Authorization Code + PKCE                           │
│   Providers: GitHub, Google                                 │
│   State: 32 bytes random (CSRF protection)                  │
├─────────────────────────────────────────────────────────────┤
│ OAuth 2.0 (as Provider)                                     │
│   Grants: auth_code, auth_code+pkce, client_credentials    │
│   Endpoints: /authorize, /token, /revoke, /introspect      │
├─────────────────────────────────────────────────────────────┤
│ TOTP                                                        │
│   Algorithm: HMAC-SHA1                                      │
│   Secret: 160-bit, Base32                                   │
│   Digits: 6                                                 │
│   Period: 30 seconds                                        │
│   Window: ±1 step (90s total)                              │
│   URI: otpauth://totp/Talos:{email}?secret=...&issuer=Talos│
└─────────────────────────────────────────────────────────────┘
```

---

*Project Talos Learning Guide v1.0 — Master the foundations of secure authentication.*
