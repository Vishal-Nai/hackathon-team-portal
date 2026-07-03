# Hackathon Team Portal

A public, mobile-first React + TypeScript + Vite portal for hackathon team idea registration and final project submission.

## Features

- Two public workflows: idea registration and final project submission.
- Organizer settings flow that creates a unique hackathon link.
- Firebase Firestore storage for hackathon settings, registrations, and submissions.
- React Hook Form + Zod validation.
- Light/dark theme toggle.
- Autosaved drafts in `localStorage` (scoped per hackathon portal).
- Dynamic team member list with a maximum of 6 members.
- Production-minded UI inspired by Cursor, Vercel, Linear, and GitHub.

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Firebase web app config:

```bash
VITE_HACKATHON_NAME="Hackathon Team Portal"
VITE_HACKATHON_TAGLINE="A clean two-step portal for collecting team ideas and final project links."
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

## Firebase Console Setup

Follow these steps in your Firebase project. If you already created a project for this portal, skip to the **Existing project checklist** below.

### 1. Create A Firebase Project (new projects only)

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Enter a project name, for example `Hackathon Team Portal`.
4. Click **Continue**.
5. For Google Analytics, choose **Disable** for the simplest setup.
6. Click **Create project**.
7. Wait for Firebase to finish setup, then click **Continue**.

### 2. Create A Web App (if not done yet)

1. On the Firebase project home page, click the **Web** icon: `</>`.
2. Enter app nickname: `Hackathon Portal`.
3. Click **Register app**.
4. Copy the config values into `.env.local`.

Example:

```bash
VITE_FIREBASE_API_KEY="apiKey value"
VITE_FIREBASE_AUTH_DOMAIN="authDomain value"
VITE_FIREBASE_PROJECT_ID="projectId value"
VITE_FIREBASE_STORAGE_BUCKET="storageBucket value"
VITE_FIREBASE_MESSAGING_SENDER_ID="messagingSenderId value"
VITE_FIREBASE_APP_ID="appId value"
```

### 3. Enable Anonymous Authentication (required)

The refactored portal requires anonymous sign-in for Firestore writes.

1. In the left menu, click **Build → Authentication**.
2. Click **Get started** if needed.
3. Open the **Sign-in method** tab.
4. Enable **Anonymous** and click **Save**.

### 4. Create Firestore Database (if not done yet)

1. In the left menu, click **Build → Firestore Database**.
2. Click **Create database** if you do not already have one.
3. Choose **Start in production mode**.
4. Select a region close to your users. For India, choose `asia-south1` if available.
5. Click **Enable**.

### 5. Publish Firestore Security Rules (required)

The old starter rules in this README are **no longer valid**. Use the rules file in the repo root: `firestore.rules`.

**Option A — Firebase CLI (recommended):**

```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

**Option B — Firebase Console:**

1. Open **Firestore Database → Rules**.
2. Replace the rules with the contents of `firestore.rules` from this repo.
3. Click **Publish**.

### 6. Deploy The Admin Recovery Cloud Function (required for admin edits on a new device)

Organizers can update settings on the same browser where they created the portal. To recover admin access on another device using the admin link, deploy:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:updateHackathonConfig
```

If you skip this step, portal creation and attendee submissions still work. Admin settings updates on a **new browser/device** will fail until the function is deployed.

### 7. Add Authorized Domains (required for production)

1. Open **Authentication → Settings → Authorized domains**.
2. Add your production domain (for example `your-app.vercel.app`).
3. `localhost` is allowed by default for local dev.

### 8. Optional: Enable App Check

For stronger bot protection:

1. Open **Build → App Check**.
2. Register your web app with reCAPTCHA v3.
3. Add the site key to `.env.local` as `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
4. When ready, enforce App Check for Firestore in the App Check settings.

### 9. Run The Portal Locally

```bash
npm run dev
```

Open the local URL shown by Vite. It is usually:

```text
http://localhost:5173
```

### 10. Create Your First Hackathon

1. Open the portal in your browser.
2. Click **Settings** in the top-right corner.
3. Enter the hackathon title and tagline.
4. Click **Save and Generate Link**.
5. Copy the **Attendee link** and **Admin edit link**.
6. Share the attendee link with teams. Store the admin link safely.

### 11. View Submitted Data

1. Go back to [Firebase Console](https://console.firebase.google.com/).
2. Open your project.
3. Click **Build → Firestore Database → Data**.
4. Open the `hackathons` collection.
5. Open a hackathon document to see:
   - `ideaRegistrations`
   - `finalSubmissions`

---

## Existing Project Checklist

If you already set up Firebase before the refactoring, you only need to change these things:

| Step | Required? | What to do |
|------|-----------|------------|
| Enable **Anonymous Auth** | **Yes** | Authentication → Sign-in method → Anonymous → Enable |
| Replace **Firestore rules** | **Yes** | Deploy `firestore.rules` (old rules will block writes) |
| Deploy **Cloud Function** | **Yes** (for admin recovery) | `firebase deploy --only functions:updateHackathonConfig` |
| Add **authorized domain** | **Yes** (for production) | Authentication → Settings → Authorized domains |
| Enable **App Check** | Optional | Recommended before high-traffic launch |
| Re-create **hackathon portal** | Recommended | Old portals lack `organizerUid` and won't support settings updates |

Your `.env.local` Firebase config values (`VITE_FIREBASE_*`) do **not** need to change unless you add optional App Check keys.

---

## Data Model

Firestore stores each hackathon as one document:

```text
hackathons/{portalId}
  title
  tagline
  adminTokenHash
  organizerUid
  createdAt
```

Idea registrations (one per team lead email):

```text
hackathons/{portalId}/ideaRegistrations/{teamLeadEmail}
  createdAt
  teamLeadEmail
  teamName
  projectName
  tagline
  description
  domain
  techStack
  cursorUsage
  teamMembers
```

Final submissions (one per team lead email):

```text
hackathons/{portalId}/finalSubmissions/{teamLeadEmail}
  createdAt
  teamLeadEmail
  githubUrl
  liveDemoUrl
  demoVideoUrl
  notes
```

The shared attendee link looks like:

```text
https://your-domain.com/?portal=<portalId>
```

The admin edit link looks like:

```text
https://your-domain.com/?portal=<portalId>&admin=<adminToken>
```

After the first admin visit, the token is stored in `sessionStorage` and removed from the URL.

## Production Deployment

### Build

Set all `VITE_*` environment variables in your hosting provider, then:

```bash
npm run build
```

### SPA Routing

Direct visits to routes like `/register?portal=abc` require a catch-all rewrite to `index.html`.

This repo includes:

- `vercel.json` for Vercel
- `render.yaml` for Render static sites
- `public/_redirects` for Netlify
- `firebase.json` hosting rewrites for Firebase Hosting

### Vercel

1. Import the GitHub repository in [Vercel](https://vercel.com/new).
2. Framework preset: **Vite**.
3. Add all `VITE_*` variables from `.env.example` in **Project Settings → Environment Variables**.
4. Deploy. Vercel uses `vercel.json` for SPA routing.

### Render

1. Create a **Static Site** in [Render](https://render.com/) and connect this repository.
2. Render reads `render.yaml` automatically on Blueprint deploy, or set manually:
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `dist`
3. Add all `VITE_*` variables from `.env.example` in the Render dashboard.
4. SPA routing is configured via `render.yaml` rewrites.

### Firebase Hosting Example

```bash
npm run build
firebase deploy --only hosting
```

## Security Model

- Attendees can read hackathon title/tagline and create submissions only.
- Submissions require anonymous auth, a valid parent hackathon, and schema validation in Firestore rules.
- Each team lead email can register one idea and submit one final project per hackathon.
- Organizers bind to a browser session via anonymous auth when creating a portal.
- Admin token updates on a new device go through the `updateHackathonConfig` Cloud Function.
- Settings are hidden from attendees; only organizers and admin-link holders can open them.
- Optional App Check reduces automated abuse.

## How Organizers Use It

1. Open the portal.
2. Click Settings.
3. Enter the hackathon title and tagline.
4. Click Save and Generate Link.
5. Share the attendee link with teams.
6. Use **Save Settings** later to update title/tagline without changing the portal link.

Teams register ideas and submit final projects through the shared link. All data is stored in Firebase under that hackathon ID.

## Future Backend Migration

Portal config reads/writes go through `src/services/portalConfig.ts`, and submissions go through `src/services/submission.ts`. The UI can later support organizer auth, dashboards, CSV export, judging, or duplicate idea detection without rewriting the forms.
