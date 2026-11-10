# Assumptions & Engineering Decisions

This document outlines the technical decisions and assumptions made where specifications left room for engineering judgment.

---

### 1. Shift and Class Modeling (§1.3)

The assignment states that each shift (e.g. "Class 6 – Morning Shift" and "Class 6 – Day Shift") acts as a separate class with its own seat quota. Instead of designing a multi-table hierarchy (School -> Class -> Shift), each shift is stored directly as an independent `class` record with its own name and seat limit. This keeps read/write queries fast and avoids complex joins during peak registration spikes.

---

### 2. Multi-Process Concurrency & Database-Level Locking (Bonus §2.6)

**The Requirement:** Rule 1 (`held + confirmed <= totalSeats`) must hold true even if two separate backend instances run concurrently on different ports against the same database.

**My Approach:**
- In-memory synchronization primitives (like C# `lock` or `SemaphoreSlim`) fail completely in a multi-instance or scaled-out setup because memory is isolated per process.
- To make concurrency control process-agnostic, I delegated serialization directly to PostgreSQL using row-level pessimistic locking:

  ```sql
  SELECT * FROM classes WHERE id = @classId FOR UPDATE;
  ```

- When a hold request is initiated (POST /classes/{classId}/holds), an explicit database transaction is opened and locks the target class row.
- Any other request (whether originating from the same backend instance or a second process running on another port) targeting the same class must wait until the first transaction commits or rolls back.
- Under this lock, the available seat check (heldSeats + confirmedSeats < totalSeats) is strictly atomic. Once committed, the lock releases. This guarantees zero race conditions and zero seat over-allocation.

---

### 3. Dynamic Seat Expiration (§2.5 Rule 2)

**The Requirement:** Seats must release automatically once the hold duration passes without needing an external API trigger.

**My Approach:**
- Hold duration is governed by the `HOLD_DURATION_SECONDS` environment variable (default: 600s).
- Rather than relying solely on a periodic background scheduler (which introduces an artificial delay between when a hold expires and when the cron next ticks), hold validity is computed dynamically on read and write operations.

  ```sql
  status = 'HELD' AND expires_at > NOW()
  ```

- Any hold past its `expires_at` timestamp is immediately excluded from the `heldSeats` count, releasing the seat instantly the moment the countdown hits zero.
- When calling GET /holds/{id} or GET /me/holds, if a record is still stored as HELD in the database but its expiration timestamp has elapsed, the API dynamically returns `status: "EXPIRED"`.

---

### 4. Student Identity & Input Validation

- Students are identified by their 17-digit birth certificate number via the `X-Student-Id` header.
- The backend strictly enforces a 17-digit numeric string validation. Any missing, non-numeric, or incorrect-length header immediately returns 400 Bad Request.
- On the frontend, this 17-digit ID is persisted in `localStorage`. If the user refreshes or closes and reopens the browser, their ongoing application and timer are automatically restored.

---

### 5. Idempotent Confirmations (§2.5 Rule 5)

If POST /holds/{holdId}/confirm is invoked on an already confirmed hold (e.g. double-clicks or browser retries), the API returns 200 OK with status `CONFIRMED` and avoids incrementing confirmed seats again.