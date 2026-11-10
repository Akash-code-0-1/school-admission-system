# School Admission System

An online admission system built for schools operating on a strict "first-come, first-served" policy with zero lottery. The system manages temporary seat holds, prevents seat overselling during high-concurrency traffic spikes, handles automatic seat releases when holds expire, and provides an interactive React UI.

Built for the **Assistant Software Engineer Recruitment** assessment at **Onnorokom Projukti Limited**.

---

## Tech Stack

- **Backend:** C# (.NET 8 Web API), Entity Framework Core, Npgsql
- **Database:** PostgreSQL 16
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Containerization:** Docker & Docker Compose

---

## Running the Application with Docker

To spin up PostgreSQL, the .NET backend API, and the React frontend in one go, run the following command from the repository root:

```bash
docker compose up --build
```

### Application URLs:

- **Frontend UI:** [**http://localhost:3000**](http://localhost:3000)
- **Backend API:** [**http://localhost:8080**](http://localhost:8080)
- **Swagger API Docs:** [**http://localhost:8080/swagger**](http://localhost:8080/swagger)

To stop the containers:

```bash
docker compose down
```

*(All database data persists across restarts via the pgdata Docker volume).*

---

## Running Automated Tests

The test suite includes integration tests for normal admission flow, single active application constraint validation, and a concurrency test with row-level locking.

To run the backend tests locally, ensure PostgreSQL is running (e.g. via docker compose up -d db), then run:

```bash
cd backend
dotnet test
```

### What the Tests Cover:

1. **Admission Flow:** Class creation, holding a seat, and confirming admission fee.
2. **Rule #3 Validation:** Ensures a student cannot hold or confirm more than one seat in the same class at the same time.
3. **Concurrency Test (Rule #1 & Bonus):** Sends 20 simultaneous hold requests to a class with only 5 available seats. Verifies that exactly 5 succeed (201 Created) and the remaining 15 are rejected (409 Conflict) without exceeding capacity.