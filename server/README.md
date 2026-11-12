# NexaDesk API — Full-Stack Backend

NexaDesk is an AI-assisted customer support management platform powered by a Node.js and Express backend, MongoDB database, and a browser-based dashboard.

This backend provides authentication, role-based access control, ticket management, knowledge-base retrieval, AI-assisted responses, real-time communication and audit logging.

## Features

- **Authentication:** JWT-based registration, login and current-user authentication.
- **Password Security:** Password hashing using bcrypt.
- **Role-Based Access Control:** Three roles — `admin`, `manager` and `agent`.
- **Ticket Management:** Create, view, update and delete support tickets, manage priorities and statuses, assign team members, and add customer replies.
- **Ticket Search and Filtering:** Search tickets and filter by status, priority and assigned team member.
- **AI-Assisted Support:** Ticket classification and knowledge-based support responses.
- **Knowledge Base:** Create, view and delete knowledge articles.
- **AI Integration:** Optional OpenAI Responses API integration with deterministic fallback behavior when an API key is unavailable.
- **Real-Time Updates:** Socket.IO events for ticket creation, updates and replies.
- **Audit Logging:** Records important user and ticket-related actions.
- **API Protection:** Authentication middleware, role authorization, request validation, rate limiting and centralized error handling.
- **Database Seeding:** Seed script for demo users, tickets and knowledge articles.
- **Health Monitoring:** API health-check endpoint.

## Technology Stack

| Category | Technology |
|---|---|
| Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JSON Web Token (JWT) |
| Password Hashing | bcrypt |
| Real-Time Communication | Socket.IO |
| AI Integration | OpenAI API (optional) |
| Environment Configuration | dotenv |
| API Security | CORS, express-rate-limit |
| Development | Nodemon |

## Requirements

- Node.js 20 or later
- MongoDB local instance or MongoDB Atlas database
- npm
- Optional OpenAI API key

## Getting Started

### 1. Navigate to the server directory

```bash
cd server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create your environment file:

```bash
cp .env.example .env
```

Open `.env` and configure the following values:

```env
NODE_ENV=development
PORT=5002
CLIENT_ORIGIN=http://localhost:5002

MONGODB_URI=mongodb://127.0.0.1:27017/nexadesk

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Replace `JWT_SECRET` with a strong, randomly generated secret.

Add your OpenAI API key only if you want to enable the optional OpenAI integration.

**Never commit your actual `.env` file or expose private credentials on GitHub.**

### 4. Seed the database

```bash
npm run seed
```

The seed script creates or checks the demo users, tickets and knowledge articles.

### 5. Start the development server

```bash
npm run dev
```

The server runs at:

- Dashboard: http://localhost:5002
- API health: http://localhost:5002/api/health

Keep MongoDB and the backend server running while using the application.

## Demo Login

The seed script provides a demo admin account.

| Field | Value |
|---|---|
| Email | admin@nexadesk.local |
| Password | ChangeMe123! (if unchanged in your seed configuration) |
| Role | admin |

Demo manager and agent accounts are also created by the seed script. Their passwords depend on the configured seed credentials.

Change demo credentials before using the application beyond local testing.

## Available API Routes

All protected endpoints require a valid JWT access token.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/auth/me` | Get the current authenticated user |

### Ticket Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tickets` | Retrieve tickets, with supported search and filters |
| POST | `/api/tickets` | Create a ticket |
| GET | `/api/tickets/:id` | Retrieve a ticket |
| PATCH | `/api/tickets/:id` | Update ticket details, status, priority or assignment |
| DELETE | `/api/tickets/:id` | Delete a ticket (admin/manager) |
| POST | `/api/tickets/:id/replies` | Add a reply to a ticket |

### Knowledge Base

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/knowledge` | List knowledge articles |
| POST | `/api/knowledge` | Create a knowledge article |
| DELETE | `/api/knowledge/:id` | Delete a knowledge article |
| POST | `/api/knowledge/ask` | Retrieve relevant articles and generate a support answer |

### AI Services

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/classify` | Classify ticket content |

### Team Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/team` | List team members (admin/manager) |
| PATCH | `/api/team/:id/role` | Change a team member's role (admin) |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check API health |

## Authentication Example

Protected API requests require the following header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Example login request:

```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexadesk.local","password":"ChangeMe123!"}'
```

The response contains the authentication token and user information.

Use the returned token when calling protected endpoints.

## Real-Time Communication

NexaDesk uses Socket.IO to communicate ticket changes between connected dashboard sessions.

The backend emits events for:

- `ticket:created`
- `ticket:updated`
- `ticket:deleted`

Connected dashboard clients can listen for these events and refresh their ticket information without manually reloading the page.

## AI and Knowledge Retrieval

The AI assistant uses a knowledge-retrieval workflow.

1. The user submits a support question.
2. The backend searches available knowledge articles using lexical relevance.
3. Relevant article content is selected.
4. When OpenAI is configured, the model generates an answer using the retrieved information.
5. Without an OpenAI API key, deterministic fallback behavior is used.

The current retrieval implementation uses lexical matching. It is **not vector-based semantic search**.

Future improvements could include document chunking, embeddings, MongoDB Atlas Vector Search or pgvector, ingestion workers, source-level access control and retrieval evaluation.

## Database Models

The backend uses Mongoose models for:

- **User:** Stores user information, authentication data, roles and account status.
- **Ticket:** Stores ticket details, customer information, priority, status, assignment and replies.
- **KnowledgeDocument:** Stores support knowledge articles.
- **AuditLog:** Records important system activities.

## Security

NexaDesk includes:

- JWT authentication for protected routes.
- bcrypt password hashing.
- Role-based authorization.
- Request validation.
- Rate limiting.
- CORS configuration.
- Centralized error handling.
- Audit logging.

## Production Considerations

Before deploying NexaDesk for real customers:

- Use a managed database with backups and network restrictions.
- Store secrets in a secure environment or secret manager.
- Rotate JWT secrets and API keys.
- Add email verification and password reset.
- Consider MFA and session revocation.
- Configure a strict frontend origin allowlist.
- Add tenant/workspace isolation before supporting multiple organizations.
- Add integration tests and production monitoring.
- Add file scanning and secure object storage before enabling attachments.
- Implement and test invitation email delivery before advertising team invitations as a production feature.
- Review data retention, privacy and access-control requirements.

## Development Commands

```bash
npm install
npm run seed
npm run dev
npm start
```

## Project Structure

```text
server/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errors.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Ticket.js
│   │   ├── KnowledgeDocument.js
│   │   └── AuditLog.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tickets.js
│   │   ├── knowledge.js
│   │   ├── team.js
│   │   └── ai.js
│   │
│   ├── services/
│   │   └── ai.js
│   │
│   ├── utils/
│   │   └── audit.js
│   │
│   ├── seed.js
│   └── server.js
│
├── tests/
├── .env.example
├── package.json
└── README.md

```

---

**NexaDesk API**  
AI-Assisted Customer Support Management Platform  
Built with Node.js, Express.js, MongoDB and Socket.IO.