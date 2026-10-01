# Phase 7 — NestJS Recognition API

## Implemented

- `POST /persons` creates a person.
- `POST /persons/:id/embeddings` validates, normalizes, and adds one 512D embedding.
- `GET /persons` returns metadata only; raw biometric vectors are not exposed.
- `POST /recognition/search` performs representative Top K shortlist, sample rerank, and returns `MATCH` or `UNKNOWN`.
- Every endpoint above requires a Bearer token. `POST /auth/token` remains protected by `x-api-key`.
- The browser sends embeddings only. It never uploads the camera stream or face images.
- Automatic recognition is bound to a lightweight IoU `trackId`; late responses are discarded using `trackId + request sequence`.
- Detection, quality, and embedding use a consistent completed-frame snapshot.
- Recognition pauses with `MULTIPLE_FACES` when the two largest faces have similar area.
- Identity labels expire after five seconds and are removed immediately when their track disappears.

## How To Run

```powershell
npm install
npm run dev
```

Open `http://localhost:5174`.

## How To Test

1. Confirm the header shows `API OK`.
2. Open **Enroll**, start the camera, enter a unique person ID and name.
3. Capture five GOOD face samples and click **Save person to API**.
4. Open **Recognize**, present the enrolled face, and click **Recognize current face**.
5. Repeat with another person and verify the server returns `UNKNOWN` when the scores do not pass the configured threshold and margin.
6. Run automated verification with `npm test`, `npm run lint`, and `npm run build`.

## Expected Result

- Registry count comes from `GET /persons`.
- A known face returns a candidate, Top 1, Top 2, difference, server search time, and `MATCH`.
- An uncertain face returns `UNKNOWN`.
- Requests without a Bearer token receive HTTP 401.

## Known Limitations

- Data is in NestJS process memory and is cleared whenever the API restarts.
- Enrollment sends five embedding requests after creating a person; this PoC does not yet implement transactional rollback for a partially failed enrollment.
- Search is exact linear comparison. Room-first filtering and Qdrant are reserved for later phases.
