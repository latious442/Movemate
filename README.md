# MoveMate

Fullstack starter for inventorying things you are moving. The stack is intentionally
lightweight because **there is no free backend/database hosting right now**:

- **Frontend:** React 19 + Vite + TypeScript (`client/`)
- **Backend:** Express in `client/server/`, deployed through root-level serverless functions
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
│   ├── src/
│   │   ├── api.ts          # fetch wrapper for the API
│   │   ├── App.tsx         # page
│   │   └── components/     # ItemForm, ItemCard
│   ├── server/              # Express app (local dev + both serverless hosts)
│   │   ├── src/
│   │   └── data/            # db.json + messages.json (file storage)
│   └── package.json         # Client workspace
├── vercel.json
└── netlify.toml
```

## Quick start (local)

```bash
# 1. install everything (npm workspaces)
npm install

# 2. create env files
cp client/server/.env.example client/server/.env # add Cloudinary keys to test photo upload
cp client/.env.example client/.env      # leave VITE_API_URL empty for local dev

# 3. run frontend + backend together
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001 (Vite proxies `/api` → `http://localhost:3001`)

In development the default `STORAGE_DRIVER=file` writes to `client/server/data/db.json`, so
data persists across restarts with no setup. Photo upload returns a `503` until you add
Cloudinary credentials.

### Get Cloudinary credentials

1. Create a free account at https://cloudinary.com
2. Copy **Cloud name**, **API Key** and **API Secret** from the dashboard
3. Put them in `client/server/.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=1234567890
CLOUDINARY_API_SECRET=xxxxxxxx
```

### Set up registration email codes

1. Create an EmailJS email service and a template with `to_email` as the recipient,
   `user_name` as the name, and `otp_code` as the verification code.
2. Add the EmailJS service ID, template ID, and public key to
   `client/server/.env` (or your deployment's server environment variables):

```env
EMAILJS_SERVICE_ID=your-service-id
EMAILJS_TEMPLATE_ID=your-template-id
EMAILJS_PUBLIC_KEY=your-public-key
```

Registration sends a six-digit code that expires after 10 minutes. A user must verify it
before the account and session are created. The server stores only hashes of the code and
password while registration is pending. Local development uses the same server-side setup;
without the EmailJS variables, registration reports that email verification is not configured.

### Set up admin dashboard access

Set a private admin password in `client/server/.env` or your deployment's server environment:

```env
ADMIN_PASSWORD=choose-a-strong-password
```

Open `/admin/login` to sign in. The dashboard at `/admin/dashboard` shows post, user,
conversation, and message totals. Admin sessions are stored server-side and revoked when
you sign out, and expire after 30 days. The dashboard links to `/admin/dashboard/posts`, `/admin/dashboard/users`, and
`/admin/dashboard/chatmessages` for complete listing, account, and chat-message records. These
pages contain private account and message data; restrict admin credentials to authorized staff.
Admins can create and edit user profiles using approved university email addresses, set an
initial password for new users, and optionally reset passwords while editing. Admins can also
delete posts and individual chat messages. The chat page requires selecting two accounts before
loading their full conversation in either direction, sorted newest first. Never put the admin
password in client-side environment variables or commit it.

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
| `file`        | `client/server/data/db.json` and `client/server/data/messages.json` | Local dev, or any host with a real disk |
| `cloudinary`  | raw `db.json` and `messages.json` assets on Cloudinary | **Production on Vercel/Netlify** |

For production, set `STORAGE_DRIVER=cloudinary` (you already have Cloudinary for photos).
The application data is written to `movemate/db.json` and `movemate/messages.json` as
**raw** Cloudinary assets and read back on each request. Writes are serialized in-process to
reduce lost updates; for a small app this is plenty. If you outgrow it, swap the JSON stores
for a real database — the rest of the app is unaffected.

## Deploy the whole project to Vercel

Deploy the repository root as **one Vercel project**. Do not upload `client/` and the API
separately: the root `package.json` installs both workspaces, `vercel.json` builds the
frontend, and `api/index.ts` exposes the backend as a serverless function.

1. Push the entire repository to GitHub, including the root `package.json`, `package-lock.json`,
   `vercel.json`, `api/`, and `client/`.
2. In Vercel, import that repository and set **Root Directory** to the repository root
   (`.`). Use the **Other** framework preset; leave the build settings to `vercel.json`.
3. Add environment variables (Project → Settings → Environment Variables):

```
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=movemate
CORS_ORIGIN=https://your-app.vercel.app
```

4. Deploy once. The frontend is built to `client/dist`, while `/api/*` is routed to the
   `api/index.ts` function in the same deployment.

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
| `DATA_FILE`              | client/server  | Optional path relative to `client/server/`       |
| `CORS_ORIGIN`            | server         | Default `*`; set to your frontend URL in prod    |
| `CLOUDINARY_*`           | server         | Cloudinary cloud name / key / secret / folder    |
| `EMAILJS_*`            | server         | EmailJS service ID, template ID, and public key   |
| `ADMIN_PASSWORD`         | server         | Private password protecting the admin dashboard   |
| `MAX_UPLOAD_BYTES`     | server         | Upload size limit (default 8 MB)                 |
