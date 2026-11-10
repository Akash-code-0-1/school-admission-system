# AI Usage Report

This document details how AI tooling was utilized during the development of this project, areas where AI suggestions were flawed, and how those issues were identified and resolved.

---

### 1. AI Tools Used
- ChatGPT and Google ai studio

---

### 2. Where AI Was Used
- **Boilerplate Scaffolding:** Generating initial C# DTO records according to the contract in Section 1.4.
- **Frontend Prototyping:** Rapidly drafting the React Vite + Tailwind CSS layout, badge styling, and SVG icon integration.
- **Test Harness:** Writing the initial skeleton for `WebApplicationFactory<Program>` integration tests.

---

### 3. AI Mistakes Identified & How I Corrected Them

#### 1. In-Memory Locking Flaw (Concurrency Vulnerability)
- **AI Suggestion:** When asked how to prevent seat overselling during concurrent holds, the AI initially suggested using C# application-level locking (e.g. `SemaphoreSlim` or a synchronized lock object).
- **The Problem:** In-memory locks only protect a single .NET process. Under the bonus specification (Section 2.6), where two separate backend instances run concurrently on different ports against the same database, an in-memory lock fails completely because the processes do not share memory.
- **My Correction:** I rejected the AI's proposal and implemented PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) inside an explicit transaction. This delegates lock management directly to the database engine, ensuring strict serialization regardless of how many backend instances are running.

#### 2. API Contract Field Naming Discrepancies
- **AI Suggestion:** The AI generated standard RESTful response objects that used generic property names like `id` for hold records.
- **The Problem:** The specification strictly mandates exact JSON field names (e.g. `holdId`, `classId`, `studentId`, `expiresAt`) because automated grading tests will execute against these endpoints.
- **My Correction:** I reviewed the generated DTOs against Section 1.4 of the assignment brief and added explicit `[JsonPropertyName("holdId")]` attributes to guarantee exact field naming and casing.

#### 3. Delayed Seat Expiration via Background Polling
- **AI Suggestion:** The AI initially recommended running a `BackgroundService` that executes a SQL cleanup query every 30 or 60 seconds to mark expired holds.
- **The Problem:** A periodic background job introduces a lag window. A hold could expire at second 10, but the seat would remain artificially locked until second 30 when the background job finally executes.
- **My Correction:** I moved expiration evaluation directly into the query logic (`status = 'HELD' AND expires_at > NOW()`). This ensures that expired seats are released instantly the exact second their timer lapses, eliminating the need for periodic pollers.