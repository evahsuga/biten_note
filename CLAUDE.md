# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**美点発見note** (Biten Note) - A web application for recording virtues/good qualities about people in your life, based on the 美点発見® (Virtue Discovery) methodology used by 43,000 ANA employees.

**Current Phase**: Phase 1.5 - Cloud sync with Firebase (testing in production)
**Repository**: https://github.com/evahsuga/biten_note.git

## Development Commands

```bash
# Start local development server
python3 -m http.server 8000
# Access at: http://localhost:8000

# Or use VS Code Live Server extension (recommended for hot reload)
```

## Architecture

### Technology Stack
- **Frontend**: Pure HTML/CSS/JavaScript (ES6+), no build process
- **Storage**:
  - Firestore (cloud sync for authenticated users)
  - Firestore offline persistence (local cache)
  - IndexedDB fallback for anonymous users (Phase 1 legacy)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Security**: Firebase App Check with reCAPTCHA v3
- **External Libraries** (CDN):
  - Cropper.js v1.6.1 (photo cropping)
  - jsPDF v2.5.1 (PDF generation)
  - Firebase SDK v8.x (auth, firestore, app-check)

### Module Structure

The app uses global objects exposed via `<script>` tags (no bundler):

```
js/
├── firebase-config.js  # Firebase initialization & App Check
├── auth.js             # Authentication wrapper (Auth object)
├── db.js               # Database operations (DB object) - Firestore + IndexedDB
├── config.js           # Constants (CONFIG object)
├── app.js              # SPA router & main logic (App object)
├── person.js           # Person management UI (Person object)
├── biten.js            # Virtue recording UI (Biten object)
├── photo.js            # Photo cropping (Photo object)
└── pdf.js              # PDF generation (PDF object)
```

**Load order matters**: Scripts must be loaded in index.html in this order:
1. External libraries (Cropper.js, jsPDF, Firebase)
2. firebase-config.js
3. auth.js, db.js, config.js
4. app.js, person.js, biten.js, photo.js, pdf.js

### Key Design Patterns

**SPA Routing**: Hash-based routing (`#/home`, `#/person-list`, etc.) handled by `App.router()`

**Authentication Flow**:
1. Anonymous users → IndexedDB only (Phase 1 behavior)
2. Signed-up users → Firestore with offline persistence
3. Migration path: Convert IndexedDB data to Firestore on first login

**Data Sync Strategy**:
- Firestore real-time listeners for live updates
- Offline-first with Firestore persistence
- IndexedDB as fallback for anonymous users

## Important Technical Constraints

### Data Limits (CONFIG.LIMITS)
- Maximum 3 persons in free version
- Maximum 15 characters per virtue entry (`MAX_BITEN_LENGTH`)
- Maximum 100 virtues per person (`MAX_BITENS_PER_PERSON`)
- Photo size: 400×400px JPEG, max 150KB

### Storage Rules
- ❌ **NEVER use localStorage/sessionStorage** (incompatible with Claude artifacts)
- ✅ Use Firestore for authenticated users
- ✅ Use IndexedDB for anonymous users
- ✅ Use memory variables for temporary data

### Database Schema

**Firestore Structure** (per user):
```
users/{userId}/persons/{personId}
  - id, name, photo (base64), relationship, metDate, createdAt, updatedAt

users/{userId}/bitens/{bitenId}
  - id, personId, content, date, createdAt

users/{userId}/settings/appSettings
  - stats, userPlan, lastSyncAt
```

**IndexedDB Structure** (BitenNoteDB v1):
- `persons` ObjectStore (keyPath: "id")
- `bitens` ObjectStore (keyPath: "id", index: "personId")
- `appSettings` ObjectStore (keyPath: "id")

## Common Development Tasks

### Testing Authentication Flow
```javascript
// Check current auth state (in browser console)
Auth.getCurrentUser()

// Check if using Firestore or IndexedDB
DB.useFirestore  // true = Firestore, false = IndexedDB

// View Firestore data
firebase.firestore().collection('users').doc(Auth.getCurrentUserId())
  .collection('persons').get().then(snap => console.table(snap.docs.map(d => d.data())))
```

### Debugging IndexedDB
```javascript
// Check database exists
indexedDB.databases().then(console.log)

// View all persons
const request = indexedDB.open('BitenNoteDB', 1);
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction(['persons'], 'readonly');
  const store = tx.objectStore('persons');
  store.getAll().onsuccess = (e) => console.table(e.target.result);
};

// Clear all data (use with caution!)
indexedDB.deleteDatabase('BitenNoteDB');
```

### Testing PDF Export
- Navigate to `#/pdf-print` or click "PDF作成" from person detail
- PDF includes: Cover page, table of contents, individual person pages (100 slots)
- Uses jsPDF with custom fonts loaded via data URIs

## Key Features

### Person Management
- Add person with photo (camera/upload → Cropper.js → base64 storage)
- Edit name, relationship, photo via detail page modals
- Delete person with confirmation (Firestore + IndexedDB cleanup)
- List sorted by あいうえお順 (Japanese alphabetical order)

### Virtue Recording
- LINE-style chat interface with date separators
- 15-character limit enforced with real-time counter
- Date selection: Today, Yesterday, Custom date picker
- Long-press to edit/delete virtues (mobile-first UX)
- Auto-scroll to latest message

### Progress Tracking
- Counter display: ○/100 virtues per person
- Visual progress bar on detail page
- Statistics on home screen (total persons, total virtues, streak days)

### PDF Export
- Cover page with summary stats
- Table of contents with page numbers
- Individual pages per person (photo + 100 numbered slots)
- Empty slots shown as blank lines with numbers
- Download or open in new tab

## Deployment

**Production URL**: https://evahpro.github.io/biten_note/ (GitHub Pages)

**Deployment Method**:
```bash
# Automatic deployment via GitHub Actions
git add .
git commit -m "Your message"
git push origin main  # or master, check with: git branch
```

**Firebase Configuration**:
- Project ID: `biten-note-app`
- Auth Domain: `biten-note-app.firebaseapp.com`
- App Check: reCAPTCHA v3 enabled
- Firestore Rules: User-scoped security (users can only access their own data)

## Known Issues & Limitations

- **Firebase API Key Exposed**: Public API key in `firebase-config.js` is intentional (protected by App Check and Firestore rules)
- **Photo Storage**: Base64 in Firestore (not Cloud Storage) - simple but not scalable
- **Offline Limitations**: Firestore persistence works in one tab only
- **IndexedDB Migration**: One-way migration from IndexedDB to Firestore on first login

## Development History

**Phase 1.5 (Current)**: Firebase integration
- Email/Password + Google OAuth
- Firestore cloud sync with offline persistence
- Account deletion for GDPR compliance
- Long-press edit/delete for virtues
- Profile photo upload for developer info

**Phase 1 (Complete)**: IndexedDB-only prototype
- 3-person limit, 15-char virtues, 100-virtue goal
- LINE-style chat UI with Apple-inspired design
- PDF export with custom layout
- Photo cropping and compression

## Testing Checklist

### Authentication Flow
1. Sign up with email/password
2. Sign in with existing account
3. Google OAuth sign-in
4. Password reset email
5. Account deletion flow

### Data Sync
1. Add person → Verify in Firestore
2. Add virtue → Real-time update across tabs
3. Offline mode → Add data → Go online → Auto-sync
4. Sign out → Data persists on sign-in

### Person Management
1. Add person (3-person limit enforcement)
2. Photo upload/crop/save
3. Edit name, relationship
4. Delete person (confirmation + cleanup)

### Virtue Recording
1. Add virtue (15-char limit)
2. Date selection (today/yesterday/custom)
3. Long-press edit/delete
4. Chat scroll behavior

### PDF Export
1. Generate PDF for single person
2. Verify layout (cover, TOC, person pages)
3. Test with 0, 50, 100+ virtues
4. Download vs. open in tab

### Responsive Design
1. Mobile (iPhone 12 Pro: 390×844)
2. Tablet (iPad: 768×1024)
3. Desktop (1920×1080)

## Security Notes

- **App Check**: reCAPTCHA v3 protects Firestore from abuse
- **Firestore Rules**: Users can only read/write their own data (`users/{userId}/**`)
- **No Server**: Pure client-side app, no backend API
- **GDPR Compliance**: Account deletion permanently removes all user data

## Support & Documentation

- **Phase 1 Specification**: See `phase1-specification.md` for original design
- **README**: Japanese user guide in `README.md`
- **Troubleshooting**: Check browser console for Firebase auth/sync errors
