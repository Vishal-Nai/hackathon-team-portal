# Hackathon Admin Portal

A private admin dashboard for managing hackathon data from Typeform CSV exports. Sign in with Google, create events, upload registration and submission CSVs per event, review teams, detect mismatches, and export reports.

**No fixed schema** — the portal accepts any Typeform field names. Recommended names below improve auto-detection; they are not required.

## Features

- **Google sign-in** — private access for admins listed in Firestore `config/admins`
- **Events** — create and edit events (name, date, Luma link, Typeform form links); all data scoped per event
- **Event summary** — registered / submitted / missing submission counts with chase list export
- **Unified teams view** — registration + submission merged per team with clickable GitHub/demo links
- **Sync checklist** — step-by-step Typeform CSV workflow with quick-open form links
- **Column controls** — pin or hide columns per dashboard (saved in browser)
- **Dynamic CSV dashboards** — every Typeform column appears in the table as exported
- **Auto column detection** — emails, team names, members, and URLs detected from headers and cell values
- **Safe CSV import** — atomic replace: new rows written first, then stale rows purged
- **Server pagination** — paginated Firestore queries for large datasets
- **Team member view** — expand rows to see detected team members
- **Mismatch detection** — duplicate emails, invalid URLs, cross-dashboard gaps
- **Search & filters** — search all fields, filter mismatches only
- **CSV export** — download data with an `_issues` column
- **Light/dark theme**

## How It Works

```text
Typeform (registration form)  ──export CSV──┐
                                            ├──► Admin Portal (per event) ──► Firestore
Typeform (submission form)    ──export CSV──┘
```

1. Participants register and submit via **Typeform** forms you share (e.g. from your Luma event page).
2. You **export responses as CSV** from Typeform (no API or webhook required).
3. You create an **event** in the portal and upload each CSV to the matching dashboard.
4. The portal auto-detects columns, stores data in **Firestore**, and flags data issues.
5. You **re-export** from Typeform and re-upload anytime to refresh data.

---

## Typeform Setup & Connection

This portal does **not** connect to Typeform via API. The link is manual: **Typeform → CSV export → upload here**. That keeps setup simple and works with any Typeform plan.

### End-to-end workflow

| Step | Where | Action |
|------|--------|--------|
| 1 | Typeform | Create two forms: **Registration** and **Project Submission** |
| 2 | Luma / event page | Share the Typeform links with participants |
| 3 | Admin Portal | Create an event (name, date, Luma link, optional Typeform URLs) |
| 4 | Typeform | Open form → **Results** → **Export** → **CSV** |
| 5 | Admin Portal | Open event → **Registrations** or **Submissions** → upload CSV |
| 6 | Admin Portal | Review **Event summary**, **All teams**, issues → export chase list if needed |

Repeat steps 4–5 whenever you want fresh data (e.g. after registration closes or before judging).

### Exporting CSV from Typeform

1. Open your form in [Typeform](https://www.typeform.com/).
2. Go to the **Results** tab.
3. Click **Export** (or the download icon).
4. Choose **CSV**.
5. Upload that file to the correct dashboard in the portal:
   - Registration responses → **Registrations**
   - Submission responses → **Submissions**

**Tip:** Export and upload both forms for the same event so cross-checks (registration ↔ submission) can run.

### Recommended Typeform field names

You can use **any** question titles — the portal shows all columns dynamically. These names help auto-detection work reliably on the first upload (fewer overrides, better team/member parsing, cleaner cross-checks).

#### Registration form

| Field purpose | Recommended question title | Typeform field type | Notes |
|---------------|---------------------------|---------------------|-------|
| Team lead email | `Team Lead Email` | Email | **Most important** — used to match registration ↔ submission |
| Team name | `Team Name` | Short text | Shown in team summary |
| Member 1 name | `Member 1 Name` | Short text | Pair with email below |
| Member 1 email | `Member 1 Email` | Email | Repeat pattern for Member 2, 3, … |
| Member 2 name | `Member 2 Name` | Short text | |
| Member 2 email | `Member 2 Email` | Email | |
| All members (alternative) | `Team Members` | Long text | Comma-separated names if you prefer one field |

**Minimum for cross-checks:** at least one **email** field per response (ideally the team lead’s email). Use the **same person’s email** on the submission form.

#### Project submission form

| Field purpose | Recommended question title | Typeform field type | Notes |
|---------------|---------------------------|---------------------|-------|
| Team lead email | `Team Lead Email` | Email | Should match registration email |
| Team name | `Team Name` | Short text | Optional but helpful |
| GitHub repo | `GitHub Repository URL` | Website / URL | Values should start with `https://` |
| Live demo | `Live Demo URL` | Website / URL | Deployment or demo link |
| Demo video | `Demo Video URL` | Website / URL | Optional (YouTube, Loom, etc.) |
| Project title | `Project Title` | Short text | Appears in table; not required for checks |

#### Naming tips

- Use **Email** and **Website/URL** field types in Typeform where possible (validates input).
- Keep question titles **stable** — renaming a question changes the CSV header and may reset auto-detection on re-upload.
- Use **numbered member fields** (`Member 1 Name`, `Member 1 Email`) instead of one combined block when teams have 2–4 members.
- Put the **team lead email** in a dedicated email question, not buried in a long-text “tell us about your team” answer.

### What if my field names are different?

The portal still works. It detects columns by:

1. **Header text** (e.g. anything containing “email”, “github”, “demo”)
2. **Cell content** (valid emails, `https://` URLs, name-like text)

If auto-detection picks the wrong primary email (e.g. you have both “Personal Email” and “Team Lead Email”), open **Override** on the dashboard and select the correct column once. All columns remain visible in the table regardless of detection.

### Connecting Luma to this flow

The portal stores a **Luma event link** on each event for your reference (open from the event page). Luma does not sync automatically with Typeform or this portal. Typical setup:

1. Create the event on [Luma](https://lu.ma/).
2. Add Typeform registration/submission links to the Luma event description or confirmation emails.
3. Paste the Luma URL when creating the event in this portal.
4. After the hackathon, export Typeform CSVs and upload them here for review and judging.

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in Firebase config values (admins are managed in Firestore, not env vars):

```env
VITE_APP_NAME="Hackathon Admin Portal"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:5173` and sign in with Google.

---

## Firebase Console Setup

### 1. Create a Firebase project (if needed)

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the wizard.
3. Disable Google Analytics if you want the simplest setup.

### 2. Register a web app

1. On the project home page, click the **Web** icon (`</>`).
2. Register the app and copy config values into `.env.local`.

### 3. Enable Google Authentication (required)

1. Go to **Build → Authentication**.
2. Open the **Sign-in method** tab.
3. Enable **Google** and set a support email.
4. Click **Save**.

### 4. Create Firestore database (if needed)

1. Go to **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode**.
4. Pick a region close to you (e.g. `asia-south1` for India).

### 5. Add admin allowlist in Firestore (required)

Create a document that Firestore security rules use to verify admins:

| Field | Value |
|-------|-------|
| Collection | `config` |
| Document ID | `admins` |
| Field | `emails` (type: **array**) |
| Value | `["your-email@gmail.com"]` |

**Important:** `emails` must be an **array**, not a plain string. In the Firebase Console, choose field type **array** when adding it.

Example:

```json
{
  "emails": ["your-email@gmail.com"]
}
```

To add more admins later, edit this document in the Firebase Console (rules block client writes to `config/admins`).

### 6. Deploy Firestore security rules and indexes (required)

**Option A — Firebase CLI (recommended):**

```bash
npx firebase-tools login
npx firebase-tools use your-project-id
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

**Option B — Firebase Console (no CLI needed):**

1. Open **Firestore Database → Rules**.
2. Replace **all** rules with the contents of `firestore.rules` from this repo.
3. Click **Publish**.
4. Open **Firestore Database → Indexes**.
5. Add composite indexes from `firestore.indexes.json` (or deploy via CLI above).

Indexes are required for paginated queries (`importId` + `rowIndex`, `hasIssues` filters).

### 7. Add authorized domains (required for production)

1. Go to **Authentication → Settings → Authorized domains**.
2. Add your production domain (e.g. `your-app.vercel.app`).
3. `localhost` is allowed by default for local development.

### 8. Optional: App Check

For stronger bot protection:

1. Go to **Build → App Check**.
2. Register your web app with reCAPTCHA v3.
3. Add the site key to `.env.local` as `VITE_FIREBASE_APP_CHECK_SITE_KEY`.

---

## Usage

### Create an event

1. Sign in to the admin portal.
2. On the home page, click **Create event**.
3. Enter event name, date, Luma link, and optional Typeform registration/submission URLs.
4. Open the event to access the **summary**, **sync checklist**, and dashboards.

### Event summary & chase list

On each event home page:

- See **registered**, **submitted**, **missing submission**, and **data issues** counts
- Open **All teams** for the unified reg + submission view
- **Export chase list** — CSV of teams that registered but have not submitted

### Unified teams view

Route: `/events/{eventId}/teams`

- One row per team with registration and submission merged by email
- Clickable GitHub, demo, and other URL links
- Filter by status: matched, missing submission, submission only, has issues
- Export filtered teams or chase list

### Upload CSV from Typeform

1. Export CSV from Typeform (see [Typeform Setup & Connection](#typeform-setup--connection)).
2. Open the event → **Registrations** or **Submissions**.
3. Drag & drop the CSV or click **Upload CSV**.
4. Review the table — all Typeform columns appear automatically.
5. Expand rows to see detected team members and issues.

Uploading a new CSV **replaces** the previous dataset for that dashboard (safe import: new data is written before old rows are removed).

### Cross-check registrations vs submissions

After both CSVs are uploaded for an event:

- Registrations without a matching submission are flagged.
- Submissions without a matching registration are flagged.

Matching uses **emails found in each row** (primary email + any other email fields). Click **Re-analyze** to refresh cross-checks after uploading or updating data.

### Export data

Click **Export CSV** to download the current dataset with an `_issues` column listing detected problems.

---

## Data Model

```text
config/admins
  emails: string[]

events/{eventId}
  name, date, lumaEventLink, typeformRegistrationUrl, typeformSubmissionUrl, createdAt, createdBy

events/{eventId}/datasets/registrations
  columns, columnMapping, fileName, uploadedAt, uploadedBy, rowCount, issueCount, importId

events/{eventId}/datasets/registrations/rows/{rowId}
  rowIndex, fields, issues, hasIssues, importId

events/{eventId}/datasets/submissions
  (same meta fields)

events/{eventId}/datasets/submissions/rows/{rowId}
  rowIndex, fields, issues, hasIssues, importId
```

Each CSV row is stored as a Firestore document with dynamic `fields` (whatever columns your Typeform export contains).

---

## Column Detection

The portal is **fully dynamic** — upload any Typeform CSV and all columns appear in the table as-is. No fixed schema is required.

Detection uses **both column headers and actual cell values**:

| Purpose | How it's detected |
|---------|-------------------|
| Primary email | Column with the highest ratio of valid, unique email values (header hints are a bonus, not required) |
| Team name | Text column with name-like values |
| Members | Additional email/name columns, numbered pairs, or comma-separated member lists |
| URL fields | Columns where values look like `https://...` (GitHub, demo, video inferred from content) |

Cross-checks between registrations and submissions match on **any email in a row**, so different field names between forms still work.

Optional **Override** (collapsed by default) lets you pick a different primary email column if auto-detection is wrong.

---

## Production Deployment

### Build

Set all `VITE_*` environment variables in your hosting provider, then:

```bash
npm run build
```

### SPA routing

Direct visits to routes like `/events/abc123/registrations` require a catch-all rewrite to `index.html`. This repo includes:

- `vercel.json` for Vercel
- `render.yaml` for Render
- `public/_redirects` for Netlify
- `firebase.json` hosting rewrites for Firebase Hosting

### Vercel

1. Import the repository in [Vercel](https://vercel.com/new).
2. Framework preset: **Vite**.
3. Add all `VITE_*` variables from `.env.example`.
4. Deploy.

### Firebase Hosting

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes
```

---

## Security Model

- Only Google accounts in Firestore `config/admins.emails` can read/write data (rules enforce this server-side).
- All routes require authentication.
- Firestore rules deny access to unauthenticated users and non-admin emails.
- `config/admins` is read-only from the client — manage admins in Firebase Console.
- No public forms or anonymous access — Typeform handles participant-facing forms.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Permission denied" on upload | Old rules still deployed. Publish `firestore.rules` and deploy indexes |
| "Permission denied" but email is in Firestore | `emails` field is probably a **string** instead of an **array** — recreate as array type |
| "Account is not authorized" | Add your Gmail to `config/admins.emails` in Firebase Console |
| Query requires an index | Run `npx firebase-tools deploy --only firestore:indexes` |
| Google sign-in popup blocked | Allow pop-ups for localhost or your production domain |
| "Google sign-in is not enabled" | Enable Google provider in Firebase Authentication |
| Wrong primary email detected | Use **Override** on the dashboard, or rename Typeform question to `Team Lead Email` |
| No team members in expand view | Use numbered fields (`Member 1 Name` / `Member 1 Email`) or a `Team Members` text field |
| Cross-check issues missing | Upload both CSVs for the same event, ensure emails match, then click **Re-analyze** |
| Cross-check false positives | Use the same team lead email on registration and submission forms |
| Data empty after re-upload | Re-upload CSV — safe import uses `importId`; legacy rows are replaced on next import |
| Typeform column missing in table | Re-export CSV from Typeform; ensure the question has at least one response |

---

Built with [Cursor](https://cursor.com).
