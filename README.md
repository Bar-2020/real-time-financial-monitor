# Real-Time Financial Monitor - Bar Almog

Accepts transactions over HTTP and pushes them to a live dashboard over WebSockets.

- **Backend:** .NET 8 minimal API, SignalR, optional Redis Pub/Sub
- **Frontend:** React, TypeScript and Vite

Running several instances, the Dockerfile and the Kubernetes manifests are covered in [backend/README.md](backend/README.md).

## Run

You need the .NET 8 SDK (or a newer SDK with the .NET 8 runtime) and Node 20+. From the repo root:

```bash
npm --prefix frontend ci
```

Run the backend from Visual Studio (open `backend/FinancialMonitor.sln` and start `FinancialMonitor.Api` with the `http` profile) or from the CLI:

```bash
dotnet run --project backend/FinancialMonitor.Api
```

Start the dashboard in a separate terminal:

```bash
npm --prefix frontend run dev
```

The API listens on port 5080 and Vite on port 5173. Open <http://localhost:5173>.

| Route | What it does |
|---|---|
| `/add` | Simulator. Sends mock transactions as `Pending`. The backend resolves each one to `Completed` or `Failed` 5 to 20 seconds later |
| `/monitor` | Live dashboard, with status colours and a status filter |

Open each route in its own tab to watch transactions arrive.

### Several instances

With Kubernetes enabled in Docker Desktop (Settings, Kubernetes, Enable), one line builds the image and deploys 5 API instances plus Redis. It works in bash and PowerShell:

```bash
docker build -t financial-monitor-api:latest backend; kubectl --context docker-desktop apply -f backend/k8s
```

The cluster serves the API on port 5080, the same as `dotnet run`, so the dashboard needs no setup. Stop any local `dotnet run` first, install the frontend packages once, then start the dashboard:

```bash
npm --prefix frontend ci
```

```bash
npm --prefix frontend run dev
```

Then open <http://localhost:5173/monitor>. Cleanup and details are in [backend/README.md](backend/README.md).

## Test

```bash
dotnet test backend/FinancialMonitor.sln
```

```bash
npm --prefix frontend test
```

Two multi-instance tests need a real Redis and are skipped without one:

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

```bash
TEST_REDIS=localhost:6379 dotnet test backend/FinancialMonitor.sln
```

## API

### `POST /api/transactions`

```bash
curl -i -X POST http://localhost:5080/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"transactionId":"3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b","amount":1500.50,"currency":"USD","status":"Pending","timestamp":"2024-01-15T10:00:00Z"}'
```

Returns `202` if the body is valid, or `400` naming the invalid fields. `status` is `Pending`, `Completed` or `Failed`.

POST is an upsert on `transactionId`. Only a strictly newer `timestamp` changes a row, so duplicates and late arrivals are accepted and ignored.

### WebSocket hub: `/hubs/transactions`

| Server message | When | Payload |
|---|---|---|
| `snapshot` | On every connect and reconnect | The latest 100 transactions, newest first (`Hub:SnapshotSize`) |
| `transaction` | When a row changes | One transaction |

### `GET /health`

Used by the Kubernetes probes.

## How it works

**Consistency.** `TransactionStore` keeps the latest 10,000 transactions in memory behind one lock, because the timestamp check, the write and the eviction must be a single atomic step. The result of that step decides whether to broadcast, so a duplicate never reaches a client.

**Resolution.** The backend settles every `Pending` transaction it accepts, 20% as `Failed` and the rest as `Completed`, after a random delay. The failure rate and the delay range are the `PendingResolution` section of `appsettings.json`. Only the instance that took the POST does it, and the others get the result over Redis, so a transaction is never resolved twice. A transaction that already has a final status by then is left alone. A `Pending` row stays `Pending` if its instance stops before the delay ends.

**Connections.** SignalR handles thread-safe sending to all connected clients. Each client gets a snapshot when it connects, then live updates. It joins the broadcast before reading the snapshot, so nothing falls between the two, and the client's merge handles any overlap.

**Performance.** Incoming messages go into a buffer that flushes into React state every 100ms as one update. The list is capped at 100 rows, rows are memoised, and `Intl` formatters are created once.

**Animation.** New rows fade and slide in using only `opacity` and `transform`, and status badges transition their colours. History loaded on connect doesn't animate, and `prefers-reduced-motion` turns it all off.

## Project structure

```
backend/
  FinancialMonitor.Api/     API, hub, store, validation and Redis sync
  FinancialMonitor.Tests/   xUnit tests, including a real SignalR client over WebSockets
  k8s/                      Kubernetes manifests
  Dockerfile
frontend/src/
  api/                      HTTP and SignalR calls to the backend
  components/               one folder per component, with its CSS and tests
    AddPage/                /add
    App/                    navigation and routes
    MonitorPage/            /monitor
    TransactionRow/         one row, with its status badge and animations
  constants/                shared constants
  hooks/                    useTransactions: connection and batching
  types/                    shared types
  utils/                    mock data and the merge rule
```

## Known limits

- History lives in memory, so restarting the backend clears it. The dashboard is a live view, not the permanent record.
- There's no authentication, so anyone who can reach the API can post to it and read the stream.
- The frontend expects the API on the same origin, through the Vite proxy in development or an ingress in production, so CORS isn't configured.
