# Project Talos

> **"Fortified Execution. Absolute Control."**

---

## Executive Summary

Project Talos is a comprehensive learning-focused backend platform that combines enterprise-grade authentication with secure remote code execution capabilities. Named after the mythical bronze automaton who protected Crete—an ancient guardian of unbreakable vigilance—this project aims to master the cutting edge of web security and isolated computation.

---

## Vision Statement

To build a production-ready API platform that demonstrates mastery of modern authentication paradigms and secure sandboxed code execution—skills essential for senior backend engineering roles and platform architecture.

---

## Project Identity

| Attribute | Value |
|-----------|-------|
| **Codename** | Talos |
| **Tagline** | Fortified Execution. Absolute Control. |
| **Domain Focus** | Security & Isolated Computation |
| **Learning Goal** | Advanced Auth Mechanics + Container Orchestration |
| **Target Deployment** | Low-Power VPS (Docker Compose) |

---

## Core Pillars

### Pillar 1: The Citadel (Authentication Engine)

The authentication subsystem serves as the project's security fortress, implementing multiple layers of identity verification and access control.

**Business Capabilities:**
- User registration and credential management
- Multi-factor authentication for high-security operations
- Third-party identity provider integration
- Machine-to-machine authentication for API consumers
- Session management and token lifecycle control

**Target Users:**
- End users requiring secure account access
- Developers integrating via OAuth 2.0 clients
- Administrators managing security policies

---

### Pillar 2: The Forge (Code Execution Sandbox)

The execution engine provides a secure environment for running untrusted code, enabling use cases from online judges to educational platforms.

**Business Capabilities:**
- Multi-language code execution (Python, JavaScript, Go, Rust)
- Resource-constrained execution with timeout guarantees
- Asynchronous job processing with status tracking
- Execution result persistence and retrieval

**Target Users:**
- Developers testing code snippets
- Educational platforms requiring automated grading
- API consumers needing serverless-like execution

---

## Success Metrics (Learning Outcomes)

| Milestone | Outcome |
|-----------|---------|
| **Auth Mastery** | Implement JWT, OAuth 2.0, TOTP, and SSO from scratch |
| **Container Security** | Build isolated execution with resource limits |
| **Production Readiness** | Deploy with Nginx, rate limiting, and monitoring |
| **Pattern Fluency** | Apply Repository Pattern consistently across codebase |

---

## Technology Philosophy

- **Learn by Building**: No shortcuts—implement core mechanics manually before using libraries
- **Security First**: Every feature considers attack vectors and mitigations
- **Production Mindset**: Design for real deployment constraints (low-power VPS)
- **Clean Architecture**: Strict separation of concerns via Repository Pattern

---

## Deployment Context

**Target Environment:**
- Single low-power VPS (2-4 vCPU, 4-8GB RAM)
- Docker Compose orchestration
- Pre-existing PostgreSQL and Redis containers
- Nginx reverse proxy at the edge

**Constraints:**
- Must operate efficiently under resource limits
- Docker-in-Docker or sibling container execution
- Network isolation between execution containers

---

## Risk Considerations

| Risk | Mitigation Strategy |
|------|---------------------|
| Container escape | Strict seccomp profiles, no privileged mode |
| Resource exhaustion | Hard limits on CPU, memory, execution time |
| Token theft | Short-lived access tokens, secure refresh rotation |
| Brute force attacks | Nginx rate limiting, account lockout policies |

---

## Project Phases

1. **Foundation** — Project structure, Repository Pattern, database models
2. **Citadel** — JWT implementation, then OAuth, then MFA/TOTP
3. **Forge** — Docker execution engine, job queue, sandboxing
4. **Fortification** — Nginx configuration, rate limiting, security hardening
5. **Polish** — Monitoring, logging, documentation

---

## The Talos Brand

**Why Talos?**

In Greek mythology, Talos was a giant bronze automaton created to protect the island of Crete. He circled the island three times daily, guarding against invaders and maintaining absolute vigilance. This mirrors our project's dual mission:

- **Protection**: Like Talos guarding Crete, our authentication system guards access
- **Execution**: Like Talos enforcing boundaries, our sandbox enforces isolation
- **Tireless Vigilance**: Like Talos's eternal patrol, our system maintains constant security

---

*Project Talos — Where security meets execution.*
