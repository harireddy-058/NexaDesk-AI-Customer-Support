# NexaDesk Production Architecture

## Services
- `frontend`: React + TypeScript + Vite. Pages: Overview, Inbox, Customers, Knowledge, Assistant, Analytics, Team, Settings.
- `api`: Node.js + Express. Owns authentication, authorization, tickets, customers, messages, assignments, notifications, audit logs and analytics.
- `ai-service`: Python + FastAPI. Owns classification inference, embedding generation, retrieval and grounded response orchestration.
- `worker`: asynchronous document extraction, chunking, embedding, indexing and notification jobs.
- `postgres`: users, organizations, tickets, messages, documents, chunks, predictions and audit records. Enable pgvector.
- `redis`: caching, rate limiting and job queue.
- `object storage`: original documents and attachments.

## Request flow
1. Browser authenticates with the API and receives a secure session.
2. Ticket CRUD goes through the Node API. The API checks organization membership and role.
3. On ticket creation, the API stores the ticket and enqueues classification.
4. Worker calls the AI service and stores the prediction with model version and confidence.
5. Document upload stores the original file, then enqueues extraction, chunking and embedding.
6. Assistant query embeds the question, retrieves authorized chunks, reranks them, and sends only relevant context to the LLM.
7. The answer returns citations to document IDs and chunk IDs. If evidence is weak, abstain.

## Suggested tables
- organizations(id, name, created_at)
- users(id, organization_id, name, email, password_hash, role, created_at)
- customers(id, organization_id, name, email, created_at)
- tickets(id, organization_id, customer_id, assignee_id, subject, description, category, priority, status, created_at, updated_at)
- messages(id, ticket_id, sender_id, body, created_at)
- attachments(id, ticket_id, storage_key, mime_type, size_bytes)
- documents(id, organization_id, title, storage_key, status, uploaded_by, created_at)
- document_chunks(id, document_id, chunk_index, content, embedding vector, metadata jsonb)
- predictions(id, ticket_id, model_name, model_version, category, sentiment, priority, confidence, created_at)
- audit_logs(id, organization_id, actor_id, action, entity_type, entity_id, created_at)

## API conventions
Prefix `/api/v1`; validate all request bodies; use pagination; return consistent error objects; enforce tenant isolation on every query. AI service endpoints should be internal or service-authenticated.

## Security
- Use Argon2id or bcrypt password hashing.
- Prefer secure, HttpOnly, SameSite cookies for browser sessions.
- Enforce organization-scoped RBAC on every endpoint.
- Validate MIME type and size for uploads; scan files; store outside web root.
- Verify webhook signatures where applicable.
- Apply rate limits and request size limits.
- Never expose model or provider API keys in the browser.
- Treat document text as untrusted prompt input; defend against prompt injection.
- Log access to private documents and return citations only from authorized documents.

## ML evaluation
Ticket classifier: macro-F1, per-class precision/recall, confusion matrix, calibration and drift.
RAG: Recall@K, MRR, groundedness, citation correctness, abstention quality and latency.
Do not present synthetic demo metrics as real results.
