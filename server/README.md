# NexaDesk API — Full-stack upgrade

This service adds a real Express/MongoDB backend to the working NexaDesk browser dashboard.

## Included capabilities
- JWT registration/login and current-user endpoint; first registered user becomes admin.
- Password hashing with bcrypt; role-based access (`admin`, `manager`, `agent`).
- Ticket CRUD, pagination, text search, status/priority/category filters, message thread, assignment field, ticket metrics.
- Automatic AI/rule-based ticket category, priority and sentiment classification.
- Knowledge article CRUD and a retrieval-augmented support answer endpoint.
- Optional OpenAI Responses API integration; without an API key, safe deterministic fallback behavior is used.
- Socket.IO events for ticket creation, updates and messages.
- Audit logging, validation, rate limiting, Helmet, CORS and centralized errors.
- Seed script and health endpoint.

## Requirements
- Node.js 20+
- MongoDB local instance or MongoDB Atlas database
- Optional OpenAI API key for LLM answers/classification

## Start locally
```bash
cd server
cp .env.example .env
```
Edit `.env`: set `MONGODB_URI` and replace `JWT_SECRET` with a long random value. Add `OPENAI_API_KEY` if available.

```bash
npm install
npm run seed
npm run dev
```
Open `http://localhost:5000` for the existing NexaDesk UI.
API health: `http://localhost:5000/api/health`

Seed login:
- Email: `admin@nexadesk.local`
- Password: `ChangeMe123!`

Change this demo password before using the system beyond local testing.

## Main API routes
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account (first account becomes admin) |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Current authenticated user |
| GET/POST | `/api/tickets` | List/create tickets |
| GET/PATCH/DELETE | `/api/tickets/:id` | Read/update/delete ticket |
| POST | `/api/tickets/:id/messages` | Add a conversation message |
| GET | `/api/tickets/metrics/summary` | Ticket status totals |
| GET/POST | `/api/knowledge` | List/create knowledge articles |
| DELETE | `/api/knowledge/:id` | Delete article |
| POST | `/api/knowledge/ask` | RAG-style answer with cited article sources |
| POST | `/api/ai/classify` | Classify ticket text |
| GET | `/api/team` | List agents (manager/admin) |
| PATCH | `/api/team/:id/role` | Change role (admin) |
| PATCH | `/api/team/:id/active` | Activate/deactivate account |
| GET | `/api/health` | Health check |

Protected endpoints require:
`Authorization: Bearer <token>`

Example:
```bash
curl -X POST http://localhost:5000/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"admin@nexadesk.local","password":"ChangeMe123!"}'
```

## AI/RAG boundary
The current retrieval stage ranks knowledge articles by lexical relevance. When `OPENAI_API_KEY` is set, the model writes an answer using retrieved article text and is instructed not to invent policy. For production semantic RAG, add chunking, embeddings, a MongoDB Atlas Vector Search index (or pgvector), ingestion workers, source-level access control and evaluation. Do not describe lexical retrieval as vector search.

## Production checklist
- Use a managed database with backups and network allowlists.
- Store secrets in a secret manager; rotate JWT secrets and API keys.
- Add email verification, password reset, MFA and refresh-token/session revocation.
- Add file scanning and object storage before enabling customer attachments.
- Configure a strict allowlist for `CLIENT_ORIGIN`.
- Add tenant/workspace IDs to every model and query before multi-tenant deployment.
- Add integration tests, observability, retention policies and privacy review.
- Add a real invitation email flow before advertising team invites as delivered.

## Important
The current dashboard is still the original vanilla HTML/CSS/JS prototype and stores its displayed demo data in browser localStorage. This API is a working backend foundation, but the dashboard's existing ticket forms have not yet been migrated to call these API routes. The API can be tested independently now; the next integration pass should connect login, ticket CRUD, knowledge, analytics and live events to the UI.
