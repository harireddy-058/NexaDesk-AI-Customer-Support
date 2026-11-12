
# NexaDesk — AI Customer Support Intelligence Platform

NexaDesk is a full-stack customer-support management platform designed to help support teams manage customer tickets, organize knowledge resources, and generate AI-assisted support answers.

## Features

### 1. Authentication and Access Control
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Admin, manager and agent roles

### 2. Ticket Management
- Create and manage customer tickets
- Track ticket status and priority
- Assign tickets to team members
- Add replies to customer conversations
- Search and filter tickets
- Record ticket activity

### 3. Customer Directory
- View customers from ticket records
- Search customer information
- Review customer ticket history

### 4. Knowledge Base
- Create and manage knowledge articles
- Organize articles by category
- Search support documentation
- Use approved articles as AI context

### 5. AI Support Assistant
- Search relevant knowledge articles
- Generate answers from retrieved content
- Optional OpenAI Responses API integration
- Fallback to local knowledge search

### 6. Analytics
- Ticket status statistics
- Ticket priority statistics
- Resolution-rate calculation
- CSV report export

### 7. Real-Time Updates
- Socket.IO connection
- Ticket creation events
- Ticket update events
- Ticket deletion events

### 8. Audit Logging
- Record important user actions
- Track ticket operations
- Record account activity

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT |
| Password Security | bcryptjs |
| Real-time Communication | Socket.IO |
| AI Integration | OpenAI API |
| Charts | Chart.js |

## Project Structure

```text
NexaDesk/
│
├── index.html
├── styles.css
├── app.js
├── README.md
│
└── server/
    ├── package.json
    ├── .env
    ├── .env.example
    │
    └── src/
        ├── server.js
        ├── seed.js
        │
        ├── config/
        │   └── db.js
        │
        ├── middleware/
        │   ├── auth.js
        │   └── errors.js
        │
        ├── models/
        │   ├── User.js
        │   ├── Ticket.js
        │   ├── KnowledgeDocument.js
        │   └── AuditLog.js
        │
        ├── routes/
        │   ├── auth.js
        │   ├── tickets.js
        │   ├── knowledge.js
        │   └── team.js
        │
        ├── services/
        │   └── ai.js
        │
        └── utils/
            └── audit.js
```

## Requirements

Install the following before running the application:

- Node.js
- npm
- MongoDB Community Server

## Installation

### Step 1: Install backend dependencies

Open the terminal in the main project folder:

```bash
cd server
npm install
```

### Step 2: Configure environment variables

Create the `server/.env` file using `.env.example` as a reference.

Set:
- MongoDB connection string
- JWT secret
- Server port
- Optional OpenAI API key

### Step 3: Start MongoDB

If MongoDB is installed through Homebrew on macOS, start it using:

```bash
mongod --config "$(brew --prefix)/etc/mongod.conf"
```

Keep this terminal open while using the application.

### Step 4: Seed the database

Open another terminal:

```bash
cd server
npm run seed
```

This creates the demo accounts, example tickets and knowledge articles.

### Step 5: Start NexaDesk

```bash
npm run dev
```

The application will run at:

http://localhost:5002

Health check:

http://localhost:5002/api/health

## Demo Accounts

The default seed configuration uses:

| Role | Email |
|---|---|
| Admin | admin@nexadesk.local |
| Manager | manager@nexadesk.local |
| Agent | agent@nexadesk.local |

The default local-development password is `ChangeMe123!` unless changed in `.env`.

Change these passwords before using the application beyond local development.

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |

### Tickets

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tickets` | List tickets |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets/:id` | Get ticket |
| PATCH | `/api/tickets/:id` | Update ticket |
| POST | `/api/tickets/:id/replies` | Add reply |
| DELETE | `/api/tickets/:id` | Delete ticket |

### Knowledge Base

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/knowledge` | List articles |
| POST | `/api/knowledge` | Create article |
| POST | `/api/knowledge/ask` | Ask AI |
| PATCH | `/api/knowledge/:id` | Update article |
| DELETE | `/api/knowledge/:id` | Delete article |

### Team

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/team` | List team members |
| PATCH | `/api/team/:id/role` | Update role |
| PATCH | `/api/team/:id/status` | Update account status |

## AI Assistant Configuration

The AI assistant can use local knowledge search without an OpenAI API key.

To enable OpenAI-generated answers, add a valid API key to `server/.env`:

```dotenv
OPENAI_API_KEY=your_private_api_key
OPENAI_MODEL=gpt-4o-mini
```

Restart the backend after changing environment variables.

## Development Notes

- The frontend is served by the Express application.
- MongoDB stores users, tickets, knowledge articles and audit logs.
- Authentication uses JWT bearer tokens.
- Passwords are hashed before storage.
- AI answers are grounded in retrieved knowledge articles.
- Socket.IO broadcasts ticket updates to connected clients.

## Limitations

This is a development project. It does not yet include production-grade email delivery, file attachments, password-reset email workflows, multi-tenant isolation, or vector-based semantic retrieval.

Before production deployment, add appropriate tenant isolation, secure session handling, stronger operational monitoring, backups, and deployment-specific security controls.
