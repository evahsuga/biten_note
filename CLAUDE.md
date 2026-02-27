# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**美点発見note** (Biten Note) - A web application for recording virtues/good qualities about people, based on the 美点発見® (Virtue Discovery) methodology.

**Current Version**: 2.0
**Repository**: https://github.com/evahsuga/biten_note.git

## Development Commands

```bash
# Start local development server
python3 -m http.server 8000
# Access at: http://localhost:8000

# Or use VS Code Live Server extension (recommended for hot reload)
```

### Data Migration

```bash
# Install dependencies (first time only)
npm install

# Run sortOrder migration for all users (requires service account key)
npm run migrate

# IMPORTANT: Delete service account key after migration
rm *-firebase-adminsdk-*.json
```

Migration requires Firebase Admin SDK service account key from [Firebase Console](https://console.firebase.google.com/project/biten-note-app/settings/serviceaccounts/adminsdk). See `MIGRATION.md` for details.

## Architecture

### Technology Stack
- **Frontend**: Pure HTML/CSS/JavaScript (ES6+), no build process
- **Storage**: Firestore (cloud sync) + IndexedDB fallback (anonymous users)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Notifications**: Firebase Cloud Messaging (FCM), Cloud Functions (scheduled)
- **PWA**: Service Worker, Web Push
- **External Libraries** (CDN): Cropper.js v1.6.1, jsPDF v2.5.1, Firebase SDK v8.x

### Module Structure

The app uses global objects exposed via `<script>` tags (no bundler):

```
js/
├── firebase-config.js      # Firebase initialization
├── auth.js                 # Authentication wrapper (Auth object)
├── db.js                   # Database operations (DB object)
├── db-local.js             # IndexedDB for guest mode (LocalDB object)
├── config.js               # Constants (CONFIG object)
├── app.js                  # SPA router & main logic (App object)
├── person.js               # Person management UI
├── biten.js                # Virtue recording UI
├── photo.js                # Photo cropping
├── pdf.js                  # PDF generation
├── notifications.js        # Reminder settings & FCM (Notifications object)
└── notification-messages.js # Message templates for reminders

functions/
└── index.js                # Cloud Functions (scheduled notifications, FCM)

sw.js                       # Service Worker (PWA, push notifications)
manifest.json               # PWA manifest
```

**CRITICAL - Script Load Order** in `index.html`:
1. External libraries (Cropper.js, jsPDF, Firebase SDK v8)
2. `firebase-config.js` - Initializes Firebase, auth, db globals
3. `auth.js`, `db.js`, `config.js` - Core services
4. `app.js`, `person.js`, `biten.js`, `photo.js`, `pdf.js` - UI modules

**Never reorder scripts** - the app uses global objects that must be defined before use.

### Key Design Patterns

- **SPA Routing**: Hash-based (`#/home`, `#/person-list`, etc.) via `App.router()`
- **Authentication Flow**: Anonymous → IndexedDB only; Signed-up → Firestore with offline persistence
- **Data Migration**: IndexedDB to Firestore on first login (v1.0 legacy support)

## Important Technical Constraints

### Data Limits (CONFIG.LIMITS in config.js)
- Maximum 15 characters per virtue entry (`MAX_BITEN_LENGTH`)
- Default 100 virtues per person, expandable by +100 increments
- Photo size: 400×400px JPEG, max 150KB

### Storage Rules
- **NEVER use localStorage/sessionStorage for app data** (incompatible with Claude artifacts)
- **Exception**: localStorage IS acceptable for performance flags (e.g., migration status)
- Use Firestore for authenticated users, IndexedDB for anonymous users

### Database Schema

**Firestore** (per user):
```
users/{userId}/persons/{personId}
  - id, name, photo (base64), relationship, metDate, sortOrder, createdAt, updatedAt

users/{userId}/bitens/{bitenId}
  - id, personId, content, date, createdAt

users/{userId}/settings/appSettings
  - stats, userPlan, lastSyncAt
```

**IndexedDB** (BitenNoteDB v1): `persons`, `bitens`, `appSettings` ObjectStores

## Debugging

```javascript
// Check auth state
Auth.getCurrentUser()
Auth.isLoggedIn()

// View Firestore data
firebase.firestore().collection('users').doc(Auth.getCurrentUserId())
  .collection('persons').get().then(snap => console.table(snap.docs.map(d => d.data())))

// View IndexedDB
indexedDB.databases().then(console.log)

// Clear IndexedDB (caution!)
indexedDB.deleteDatabase('BitenNoteDB');
```

## Deployment

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| Development | main | https://evahsuga.github.io/biten_note/ | Testing |
| Production | production | https://biten-note.netlify.app | Public |

```bash
# Development: push to main → auto-deploy to GitHub Pages
git push origin main

# Production: merge main → production → auto-deploy to Netlify
git checkout production && git merge main && git push origin production && git checkout main
```

See `DEPLOY.md` for detailed instructions.

**Firebase Project**: `biten-note-app`

## Known Issues

- **App Check Disabled**: Currently disabled for performance testing (see `firebase-config.js`)
- **Photo Storage**: Base64 in Firestore (not Cloud Storage) - not scalable for large photos
- **Offline Multi-tab**: Firestore persistence causes `failed-precondition` error with multiple tabs

## Critical Lessons Learned

### Firestore Query Behavior with Missing Fields

**Incident (2026-01-02)**: Added `sortOrder` field for drag-and-drop sorting. Used `.orderBy('sortOrder')` query which **excludes documents missing that field**. Result: 19 of 21 persons became invisible.

**Solution**:
1. Remove `.orderBy()` from Firestore query
2. Sort client-side with fallback:
```javascript
persons.sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
    } else if (a.sortOrder !== undefined) return -1;
    else if (b.sortOrder !== undefined) return 1;
    else return new Date(a.createdAt) - new Date(b.createdAt);
});
```
3. Add automatic migration on login (`DB.migrateSortOrder()`)

**Key Takeaway**: `orderBy(field)` excludes documents where field is undefined. Always test with production-like data that may lack new fields.

### Performance with Large Datasets

**Issue (2026-01-03)**: User with 19 persons + 1500 bitens experienced 3+ minute login on mobile.

**Root Cause**: Migration check (`DB.migrateSortOrder()`) ran on every login.

**Solution**: LocalStorage flag to skip migration after first run:
```javascript
const migrationKey = `sortOrder_migrated_${userId}`;
if (localStorage.getItem(migrationKey) === 'true') return;
// ... run migration ...
localStorage.setItem(migrationKey, 'true');
```

**Key Takeaway**: Test with production-scale data. Mobile performance != Desktop performance. Migrations should be one-time operations.
