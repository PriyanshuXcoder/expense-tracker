# ExpenseTrack 💳

**ExpenseTrack** is a production-ready, full-stack personal finance application designed to help users track, categorize, and analyze their daily expenses. Built with a focus on clean architecture, robustness, and a premium user experience, this application demonstrates industry best practices from the database layer up to the UI.

### ✨ Key Features
- **Modern & Responsive UI**: A beautiful, dark-themed React frontend with smooth gradients and glassmorphism elements.
- **Robust Financial Handling**: Prevents floating-point errors by securely handling all monetary values as integer cents.
- **Idempotent API**: Guarantees data integrity during network failures or double-clicks using idempotency keys.
- **Clean Architecture**: A highly organized Node/Express backend separating routes, controllers, services, and data access.
- **Production-Ready**: Includes rate-limiting, security headers (Helmet), CORS management, and comprehensive error handling.

> "Understand exactly where your money is going with a fast, reliable, and visually stunning expense tracker."

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── __tests__/          # Integration & unit tests
│   │   ├── controllers/        # HTTP request handlers (thin layer)
│   │   ├── db/                 # SQLite connection & schema init
│   │   ├── middleware/         # Validation, idempotency, error handling
│   │   ├── models/             # Data-access layer (all SQL lives here)
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic
│   │   ├── app.js              # Express app factory
│   │   └── server.js           # HTTP server entry point
│   ├── data/                   # SQLite DB files (auto-created, git-ignored)
│   ├── .gitignore
│   ├── jest.config.json
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/                # API client with retry + idempotency
    │   ├── components/         # React components
    │   ├── hooks/              # Custom React hooks
    │   ├── utils/              # Formatters, constants
    │   ├── App.jsx             # Root component
    │   ├── index.css           # Global design system
    │   └── main.jsx            # React entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (check: `node --version`)
- **npm 9+** (check: `npm --version`)

### 1. Clone / navigate to the project

```bash
cd expense-tracker
```

### 2. Install and start the backend

```bash
cd backend
npm install
npm run dev        # starts on http://localhost:3001
```

### 3. Install and start the frontend (in a new terminal)

```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### 4. Run backend tests

```bash
cd backend
npm test
```

---

## 🔌 API Reference

### `POST /expenses`

Create a new expense.

**Optional header:** `Idempotency-Key: <uuid-v4>` — Safe to retry.

**Request body:**
```json
{
  "amount":      "12.99",
  "category":    "Food",
  "description": "Lunch at Chipotle",
  "date":        "2024-01-15"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":          "550e8400-e29b-41d4-a716-446655440000",
    "amount":      "12.99",
    "category":    "Food",
    "description": "Lunch at Chipotle",
    "date":        "2024-01-15",
    "created_at":  "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation rules:**
- `amount`: required, positive, ≤ 2 decimal places, ≤ $1,000,000
- `category`: one of `Food | Transport | Housing | Healthcare | Entertainment | Shopping | Education | Travel | Other`
- `description`: optional, ≤ 255 chars
- `date`: `YYYY-MM-DD`, not in the future

---

### `GET /expenses`

Retrieve expenses with optional filters.

**Query params:**
| Param    | Example         | Default     |
|----------|-----------------|-------------|
| category | `?category=Food`| (all)       |
| sort     | `?sort=date_asc`| `date_desc` |

**Response `200`:**
```json
{
  "success": true,
  "data": [...],
  "meta": { "count": 5, "total": "87.45" }
}
```

---

### `GET /expenses/categories/summary`

Returns per-category count and total.

```json
{
  "success": true,
  "data": [
    { "category": "Food", "count": 3, "total": "45.50" },
    { "category": "Transport", "count": 2, "total": "12.00" }
  ]
}
```

### `GET /health`

Health check endpoint for deployment platforms.

---

## 🧠 Design Decisions

### Money Handling: Integer Cents
**Problem:** IEEE 754 floating-point arithmetic cannot represent `0.1 + 0.2` exactly in binary.  
**Solution:** Store all amounts as **integer cents** in SQLite (`$12.99` → `1299`). Convert back on read with `toFixed(2)`.  
**Why not DECIMAL?** SQLite's REAL type still uses float internally. Integer cents is the most reliable approach.

### Idempotency Keys
**Problem:** A slow network can cause a client to timeout, then retry — creating duplicate expenses.  
**Solution:** Clients send a UUID v4 in the `Idempotency-Key` header. The server caches the response for 24 hours. Duplicates return the same response with `Idempotent-Replayed: true`.

### better-sqlite3 (Synchronous SQLite)
**Problem:** Async SQLite drivers add unnecessary complexity for a single-file DB.  
**Solution:** `better-sqlite3` is synchronous — queries complete in microseconds, so the Node.js event loop is effectively unblocked.  
**Benefits:** WAL mode enables concurrent reads, busy timeout prevents SQLITE_BUSY errors.

### Clean Architecture: Routes → Controllers → Services → Models
Each layer has a single responsibility:
- **Routes:** declare middleware order and HTTP verb
- **Controllers:** parse HTTP in, call service, send HTTP out
- **Services:** business rules and cross-model coordination
- **Models:** SQL queries and row mapping

### Retry with Exponential Backoff (Frontend)
Network failures are retried up to 3 times with `500ms → 1000ms → 2000ms` delays. POST retries are safe because they carry the same `Idempotency-Key`.

---

## ⚖️ Trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| SQLite | Zero setup, perfect for personal finance | Not suitable for multi-user/high-write production |
| better-sqlite3 (sync) | Simpler code, faster | Would need async driver for true I/O parallelism at scale |
| Manual validation | No extra dependencies | Larger codebases should use Zod/Joi for schema reuse |
| Integer cents | Exact money arithmetic | Must convert on every read/write |
| No pagination | Simpler MVP | Will need cursor-based pagination at ~10k+ rows |

---

## 🔮 Future Improvements

- [ ] Pagination (cursor-based) for large datasets
- [ ] DELETE / PATCH endpoints
- [ ] Budget limits per category with alerts
- [ ] CSV/PDF export
- [ ] User authentication (JWT)
- [ ] PostgreSQL migration path
- [ ] E2E tests with Playwright
- [ ] Docker Compose for one-command setup
- [ ] Real-time updates via Server-Sent Events

---

## 🌐 Deployment

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. **Root Directory:** `expense-tracker/backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add environment variable: `NODE_ENV=production`
7. Mount a **Persistent Disk** at `/opt/render/project/src/data` (so the SQLite file survives deploys)

### Frontend — Vercel

1. Import your repo at [vercel.com](https://vercel.com)
2. **Root Directory:** `expense-tracker/frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Add environment variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`

> **CORS note:** Update `ALLOWED_ORIGINS` in `backend/src/app.js` to include your Vercel URL.

### Frontend — Netlify

1. **Base directory:** `expense-tracker/frontend`
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. Add `VITE_API_BASE_URL` in Site Settings → Environment Variables
5. Create `_redirects` file in `public/`: `/* /index.html 200`

---

## 🛡️ Security Checklist

- [x] Helmet.js security headers
- [x] Rate limiting (200 req / 15 min / IP)
- [x] Body size limit (10 KB)
- [x] CORS origin whitelist
- [x] Input validation (server-side)
- [x] Parameterised SQL queries (no injection possible)
- [x] UUIDs for IDs (not sequential integers)
- [x] No sensitive data in error responses (production)
#   e x p e n s e - t r a c k e r 
 
 