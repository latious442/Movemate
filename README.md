# MoveMate

Fullstack starter for inventorying things you are moving. The stack is intentionally
lightweight because **there is no free backend/database hosting right now**:

- **Frontend:** React 19 + Vite + TypeScript (`client/`)
- **Backend:** Express, deployed as serverless functions (`server/`, `api/`, `netlify/`)
- **Data:** a JSON store — a local file in development, or a Cloudinary raw asset in production
- **Photos:** Cloudinary

> Nothing needs a database server. Everything runs on free static/serverless tiers
> with Cloudinary as the only external service.

## Project layout

```
movemate/
├── api/index.ts            # Vercel serverless entry (wraps the Express app)
├── netlify/functions/api.ts# Netlify serverless entry (wraps the Express app)
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── api.ts          # fetch wrapper for the API
│       ├── App.tsx         # page
│       └── components/     # ItemForm, ItemCard
├── server/                 # Express app (shared by local dev + both serverless hosts)
│   ├── src/
│   │   ├── app.ts          # Express routes wiring
│   │   ├── db.ts           # JSON store (file driver / Cloudinary driver)
│   │   ├── cloudinary.ts   # image + raw-JSON helpers
│   │   ├── config.ts       # env config
│   │   ├── index.ts        # local dev server
│   │   └── routes/         # items.ts, messages.ts, uploads.ts
│   └── data/               # db.json + messages.json (file storage)
├── vercel.json
└── netlify.toml
```

## Quick start (local)

```bash
# 1. install everything (npm workspaces)
npm install

# 2. create env files
cp server/.env.example server/.env      # fill in Cloudinary keys to test photo upload
cp client/.env.example client/.env      # leave VITE_API_URL empty for local dev

# 3. run frontend + backend together
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001 (Vite proxies `/api` → `http://localhost:3001`)

In development the default `STORAGE_DRIVER=file` writes to `server/data/db.json`, so
data persists across restarts with no setup. Photo upload returns a `503` until you add
Cloudinary credentials.

### Get Cloudinary credentials

1. Create a free account at https://cloudinary.com
2. Copy **Cloud name**, **API Key** and **API Secret** from the dashboard
3. Put them in `server/.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=1234567890
CLOUDINARY_API_SECRET=xxxxxxxx
```

## Using it

Open http://localhost:5173 and add an item (name, category, quantity, notes, photo).
The photo is uploaded to Cloudinary first, then the item (with the returned URL) is stored
in the JSON store.

Signed-in users can message listing owners. Messages are stored separately with a timestamp,
text, sender ID, and receiver ID. The inbox refreshes periodically to show messages from
other clients without requiring a page reload.

### API

| Method | Path              | Description                          |
| ------ | ----------------- | ------------------------------------ |
| GET    | `/api/health`     | Status + active storage/photo driver |
| GET    | `/api/items`      | List items                           |
| GET    | `/api/items/:id`  | Get one item                         |
| POST   | `/api/items`      | Create item                          |
| PATCH  | `/api/items/:id`  | Update item                          |
| DELETE | `/api/items/:id`  | Delete item (also removes the photo) |
| POST   | `/api/uploads`    | Upload an image (`multipart/form-data`, field `file`) |
| GET    | `/api/messages`   | List the signed-in user's conversations |
| GET    | `/api/messages/:userId` | Get a conversation with another user |
| POST   | `/api/messages`   | Send a message (`receiverId`, `text`) |

## Scripts

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Run API + web app together                          |
| `npm run dev:server`| Run only the Express API (tsx watch)                |
| `npm run dev:client`| Run only the Vite dev server                        |
| `npm run build`     | Production build of the frontend → `client/dist`    |
| `npm run typecheck` | Type-check the server and build the client          |
| `npm start`         | Run the API without watch (production-style, local)  |

## Data storage: read this before deploying

Serverless hosts give you a **read-only / ephemeral** filesystem, so a JSON file on disk
is fine locally but **will not persist on Vercel or Netlify**. The `STORAGE_DRIVER` env var
selects how the JSON store behaves:

| Driver        | Where data lives                  | Use for                                   |
| ------------- | --------------------------------- | ----------------------------------------- |
| `file`        | `server/data/db.json` and `server/data/messages.json` | Local dev, or any host with a real disk |
| `cloudinary`  | raw `db.json` and `messages.json` assets on Cloudinary | **Production on Vercel/Netlify** |

For production, set `STORAGE_DRIVER=cloudinary` (you already have Cloudinary for photos).
The application data is written to `movemate/db.json` and `movemate/messages.json` as
**raw** Cloudinary assets and read back on each request. Writes are serialized in-process to
reduce lost updates; for a small app this is plenty. If you outgrow it, swap the JSON stores
for a real database — the rest of the app is unaffected.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it in Vercel (framework preset: **Other** — `vercel.json` handles the build).
3. Add environment variables (Project → Settings → Environment Variables):

```
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=movemate
CORS_ORIGIN=https://your-app.vercel.app
```

4. Deploy. The frontend is served from `client/dist` and `/api/*` is routed to the
   `api/index.ts` function.

## Deploy to Netlify

The same code works on Netlify via `netlify/functions/api.ts` (powered by `serverless-http`).

1. Import the repo in Netlify (`netlify.toml` is already configured).
2. Set the same environment variables as above.
3. Deploy.

## Environment variables reference

| Variable                 | Where          | Notes                                            |
| ------------------------ | -------------- | ------------------------------------------------ |
| `VITE_API_URL`           | client         | Leave empty to use same origin + dev proxy       |
| `PORT`                   | server         | Local API port (default `3001`)                  |
| `STORAGE_DRIVER`         | server         | `file` (default) or `cloudinary`                 |
| `DATA_FILE`              | server         | Optional custom path for the file driver         |
| `CORS_ORIGIN`            | server         | Default `*`; set to your frontend URL in prod    |
| `CLOUDINARY_*`           | server         | Cloudinary cloud name / key / secret / folder    |
| `MAX_UPLOAD_BYTES`       | server         | Upload size limit (default 8 MB)                 |
