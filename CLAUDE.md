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

### Data Migration Commands

```bash
# Install dependencies (first time only)
npm install

# Run sortOrder migration for all users (requires service account key)
npm run migrate
# or
node migrate-sortorder.js

# IMPORTANT: Delete service account key after migration
rm *-firebase-adminsdk-*.json
```

**Migration Usage Notes**:
- Migration script requires Firebase Admin SDK service account key
- Download key from [Firebase Console](https://console.firebase.google.com/project/biten-note-app/settings/serviceaccounts/adminsdk)
- Service account keys are excluded from git via `.gitignore`
- See `MIGRATION.md` for detailed migration documentation

## Architecture

### Technology Stack
- **Frontend**: Pure HTML/CSS/JavaScript (ES6+), no build process
- **Storage**:
  - Firestore (cloud sync for authenticated users)
  - Firestore offline persistence (local cache)
  - IndexedDB fallback for anonymous users (Phase 1 legacy)
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Security**: Firebase App Check (currently disabled for performance testing)
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

**CRITICAL - Script Load Order**: Scripts in `index.html` must load in this exact order to avoid undefined errors:
1. External libraries (Cropper.js, jsPDF, Firebase SDK v8)
2. `firebase-config.js` - Initializes Firebase, auth, db globals
3. `auth.js`, `db.js`, `config.js` - Core services (depend on firebase globals)
4. `app.js`, `person.js`, `biten.js`, `photo.js`, `pdf.js` - UI modules (depend on Auth/DB/CONFIG)

**Never reorder scripts** - the app uses global objects (Auth, DB, CONFIG, etc.) that must be defined before use.

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
- ❌ **NEVER use localStorage/sessionStorage for app data** (incompatible with Claude artifacts)
- ✅ Use Firestore for authenticated users
- ✅ Use IndexedDB for anonymous users
- ✅ Use memory variables for temporary data
- ✅ **Exception**: localStorage IS acceptable for performance flags (e.g., migration status)

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
Auth.getCurrentUser()  // Returns user object or null
Auth.getCurrentUserId()  // Returns uid string or null
Auth.isLoggedIn()  // Returns boolean

// View Firestore data for current user
firebase.firestore().collection('users').doc(Auth.getCurrentUserId())
  .collection('persons').get().then(snap => console.table(snap.docs.map(d => d.data())))

// View all bitens (virtues) for current user
firebase.firestore().collection('users').doc(Auth.getCurrentUserId())
  .collection('bitens').get().then(snap => console.table(snap.docs.map(d => d.data())))

// Check Firestore connection status
firebase.firestore().enableNetwork().then(() => console.log('Online'))
firebase.firestore().disableNetwork().then(() => console.log('Offline mode'))
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
# Manual push to GitHub Pages
git add .
git commit -m "Your message"
git push origin main

# GitHub Pages serves directly from the main branch
# No build process required (static HTML/CSS/JS)
```

**Firebase Configuration**:
- Project ID: `biten-note-app`
- Auth Domain: `biten-note-app.firebaseapp.com`
- App Check: Temporarily disabled (see `firebase-config.js` comments)
- Firestore Rules: User-scoped security (users can only access their own data)

## Known Issues & Limitations

- **Firebase API Key Exposed**: Public API key in `firebase-config.js` is intentional (protected by Firestore rules)
- **App Check Disabled**: Currently disabled for performance testing (see `firebase-config.js` line 43-50)
- **Photo Storage**: Base64 in Firestore (not Cloud Storage) - simple but not scalable for large photos
- **Offline Limitations**: Firestore persistence works in one tab only (multi-tab causes `failed-precondition` error)
- **IndexedDB Migration**: One-way migration from IndexedDB to Firestore on first login (legacy Phase 1 data)

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

- **App Check**: Currently disabled (line 43-50 in `firebase-config.js`), to be re-enabled after performance testing
- **Firestore Rules**: Users can only read/write their own data (`users/{userId}/**`)
- **No Server**: Pure client-side app, no backend API or secrets to protect
- **GDPR Compliance**: Account deletion permanently removes all user data from Firestore
- **Google OAuth**: Uses redirect method on mobile for better compatibility (not popup)

## Support & Documentation

- **Phase 1 Specification**: See `phase1-specification.md` for original design
- **README**: Japanese user guide in `README.md`
- **Troubleshooting**: Check browser console for Firebase auth/sync errors

## Important Lessons Learned

### Database Schema Changes & Data Migration (2026-01-02)

**Incident**: Added drag-and-drop sorting feature with new `sortOrder` field, causing existing production data (21 persons) to become invisible. Only newly created test data (2 persons with `sortOrder`) was displayed.

**Root Cause**:
- Used Firestore query `.orderBy('sortOrder', 'asc')` in `getAllPersons()`
- Firestore excludes documents that don't have the field specified in `orderBy()`
- 19 existing persons had no `sortOrder` field → not returned by query
- Only 2 test persons created after the feature had `sortOrder` → appeared in results

**Impact**: Production users could not see their existing data after deployment

**Solution Implemented**:
1. Removed `.orderBy('sortOrder')` from Firestore query
2. Retrieved all documents without filtering
3. Sorted data client-side with fallback logic:
   ```javascript
   persons.sort((a, b) => {
       if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
           return a.sortOrder - b.sortOrder;
       } else if (a.sortOrder !== undefined) {
           return -1;
       } else if (b.sortOrder !== undefined) {
           return 1;
       } else {
           // Both missing sortOrder: fallback to createdAt
           return new Date(a.createdAt) - new Date(b.createdAt);
       }
   });
   ```
4. Added automatic migration on login (`DB.migrateSortOrder()`):
   - Detects documents without `sortOrder`
   - Assigns sequential numbers based on `createdAt` order
   - Uses batch update for performance

**Key Takeaways**:

1. **Always consider existing data compatibility**
   - Before adding new fields, check if existing data will still be accessible
   - Test new features with both old and new data schemas

2. **Firestore query behavior**
   - `orderBy(field)` excludes documents where `field` is undefined/missing
   - Use client-side sorting when field might not exist
   - Or use compound queries with existence checks

3. **Migration strategy**
   - Deploy schema changes WITH migration code, not separately
   - Run migrations automatically on user login
   - Make migrations idempotent (safe to run multiple times)
   - Log migration results for monitoring

4. **Testing checklist for schema changes**
   - [ ] Test with existing production-like data
   - [ ] Verify backward compatibility
   - [ ] Implement migration before rollout
   - [ ] Test migration with edge cases (no data, partial data, full data)
   - [ ] Add logging for migration monitoring

5. **Environment separation**
   - Local and production should use different Firebase projects for testing
   - Prevent accidental production data corruption during development
   - Current setup: Both environments use same Firebase project (risk identified)

**Prevention for Future**:
- Create data migration checklist for all schema changes
- Add field existence checks before using in queries
- Consider using default values or nullable patterns
- Test locally with copy of production data structure
- Document all database schema changes in this file

### Performance Optimization for Large Datasets (2026-01-03)

**Issue**: User with 19 persons and 1500 bitens experienced 3+ minute login time on mobile device

**Root Causes Identified**:
1. **Migration runs on every login**: `DB.migrateSortOrder()` called in `app.js` initialization, checking all persons even if already migrated
2. **Stats loading blocks UI**: `DB.getStats()` loads all bitens for all persons synchronously on home screen
3. **No pagination**: Loading all persons and bitens at once for large datasets

**Solutions Implemented**:

**Priority A - Quick Wins (Implemented)**:
1. **LocalStorage Migration Flag** (`db.js:16-28`):
   ```javascript
   const migrationKey = `sortOrder_migrated_${userId}`;
   const isMigrated = localStorage.getItem(migrationKey);

   if (isMigrated === 'true') {
       Utils.log('sortOrderマイグレーション済み（スキップ）');
       return; // Fast exit - saves ~30-60 seconds
   }

   // ... run migration ...

   localStorage.setItem(migrationKey, 'true'); // Save flag after completion
   ```
   - Skips migration check after first successful run
   - Per-user flag prevents false positives across accounts
   - Estimated improvement: 30-60 seconds reduction on subsequent logins

**Priority B - Planned Optimizations**:
2. **Delayed Stats Loading**: Render home screen immediately, load stats asynchronously
3. **Firestore Stats Caching**: Cache aggregated stats in Firestore (avoid calculating from 1500+ bitens)
4. **Pagination**: Load persons in batches (e.g., 10 at a time)

**Key Takeaways**:
1. **Test with production-scale data**: Local tests with 2-3 persons don't reveal performance issues
2. **Mobile performance != Desktop**: 3+ minutes on mobile, no issue on desktop for same dataset
3. **Migration should be one-time**: Use flags to skip redundant operations
4. **Separate read-time optimization from write-time**: Stats can be pre-calculated and cached
5. **localStorage for performance flags is acceptable**: Despite general rule against localStorage for data

**Monitoring**:
- Migration flag per user: `sortOrder_migrated_{userId}` in localStorage
- Check console logs: "sortOrderマイグレーション済み（スキップ）" indicates flag is working
- User feedback: Monitor login time improvements after optimization deployment
