# Frontend readiness and private beta plan

## Current status

The React site is a browser-only prototype. Collections, wishlists, saved albums and diary entries are stored on the current device. The public demo still shows a login preview; the local development site now has real session login/logout. Demo reviews are fictional and never saved as real user entries. The local Django foundation now runs with SQLite, a custom user model, a read-only health endpoint and a Vite development proxy. Local login/logout and a private terminal command to create a listener are implemented and tested. Public registration, invitations, account-specific collections/reviews and private-beta deployment controls are not implemented yet. See backend/README.md for local setup.

## Frontend work completed, in order

1. Listener journey: search/filter -> album -> collection/wishlist -> Write a review -> preselected album -> album/track rating and date -> diary -> refresh. An album page links to the separate review form; reviews remain in the diary.
2. Mobile: checked Explore, album, diary and writing pages at 900, 700, 390 and 320 pixels; no horizontal overflow. Review actions and rating choices have 44-pixel touch targets.
3. Empty and error states: empty collection/wishlist guidance, no search matches with reset, missing album, unavailable track list, browser storage warnings, and a downloadable backup when diary data is unreadable. The app does not overwrite unreadable diary data.
4. Forms: rating required (1-5), valid listening date no later than today, selected track belongs to the album, review limited to 500 characters, character counter, explicit deletion confirmation, and failed saves keep the form intact for retry.
5. Organisation: ReviewCard controls the appearance of a feed entry; ReviewForm controls the writing UI; DiaryStars renders ratings; lib/diary handles diary parsing and backup; useShelfFlags handles collection/wishlist persistence without rewriting every saved flag on page load.
6. Account data and backend boundaries are planned below.

Changing a review card's layout should not require changing its stored data or future API.

## Data that belongs to an account

| Data | Proposed fields | Access for the private beta |
| --- | --- | --- |
| Account | username, private email, Django password hash, active/invited state | Only the owner and authorised administration see private account details |
| Profile | display name; optional short bio | Visible to signed-in beta members |
| Collection | owner, pressing/edition, added date | Visible to signed-in beta members; owner alone can change it |
| Wishlist | owner, pressing/edition, added date | Owner-only initially |
| Saved album | owner, album, added date | Owner-only initially |
| Diary entry | owner, album, optional track, listening date, rating, text, repeat flag, created/updated timestamps | Visible to signed-in beta members; owner alone can edit/delete |
| Invitation | hashed token, expiry, used time | Server/admin only; not part of public profiles |

Collections should eventually reference a particular pressing, while reviews reference an album or track. Keep catalogue IDs stable; allow repeated listens as separate entries. One user must not get duplicate collection rows for the same pressing.

This visibility policy is a proposed initial beta default. Confirm it before inviting testers; do not automatically publish existing local diary entries.

## Proposed backend flow

Use Django for authentication, validation and data storage, with an API for the React UI. Prefer serving the beta frontend and backend under one HTTPS origin to simplify cookie/session handling. The current GitHub Pages site can remain a separate public demo. Select hosting and supported package versions when backend setup begins.

- Session/login/logout endpoints: Django session authentication, CSRF-protected mutations, secure HttpOnly session cookies in production. No passwords or persistent login tokens in browser localStorage.
- Album/track/pressing endpoints: read the catalogue; catalogue writes restricted to administration.
- Collection/wishlist/saved-album endpoints: derive the owner from the authenticated session, not a user ID supplied by the browser.
- Diary endpoints: paginated beta feed, create, owner-only update/delete. Validate album/track relationship, rating, text length and listening date on the server too.
- Profile endpoint: return public profile fields, never email/password details.
- Invitations/password reset: expiring, single-use tokens; no unrestricted registration during the beta.

Start with database/catalogue setup, then accounts and permission tests, then connect collections and the diary. Loading, retry and unauthorised states should be added when real network requests replace browser storage.

## Local data migration

Keep existing browser keys readable during development. Before importing anything, show the signed-in user what will be uploaded and obtain their choice. Import real entries only; exclude demo reviews. Track imported IDs to prevent duplicates on retry. Older album-page reviews have no reliable listening date: retain them as undated reviews or ask the user for a date; never invent one. Preserve the original local copy until the server confirms success. Unreadable data requires recovery from a backup before import.

## Before inviting testers — future work, not completed security

- Use Django's authentication/password handling and explicit authenticated defaults for the private beta.
- Verify anonymous access is denied; account A cannot read account B's private wishlist or modify B's records/reviews, including direct requests with guessed IDs. Filter list queries as well as checking individual objects. Test create/update ownership separately.
- Require valid CSRF tokens for cookie-authenticated writes; render review text as text, never trusted HTML.
- Put login/reset/request rate limits in place, with bounded pagination and request sizes. Django does not supply brute-force login protection automatically.
- Configure production HTTPS, allowed hosts, secure cookies and origins, DEBUG=False and environment-managed secrets. Run Django's deployment checks against the production settings.
- Use production hosting/server settings; keep dependencies patched and review alerts. Do not treat invite-only access as a security boundary by itself.
- Test database backup restoration, error alerts and account/data deletion. Keep emails and secrets out of logs.
- Keep scope small: no payments or user file uploads for the first beta. Add reporting and a way for the owner to remove abusive reviews.

References checked while preparing this plan:

- [Django authentication](https://docs.djangoproject.com/en/5.2/topics/auth/default/)
- [Django deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Django REST framework permissions](https://www.django-rest-framework.org/api-guide/permissions/)

## Repeatable manual smoke check

Run npm.cmd run dev from the project folder (npm.cmd avoids the PowerShell script policy issue). Use a separate test browser/profile so personal local data remains untouched.

1. Open My collection with no saved records; follow Explore albums.
2. Search SMITHEREENS, set oldest sorting, open it, add collection and wishlist, go back; search/sort should remain.
3. Open Write a review from that album; SMITHEREENS should be selected. Choose Disc 2 track 1, a rating and date, enter text, and upload. The card should fly into the unified feed and remain after refresh.
4. Edit the rating, cancel a deletion, then confirm a deletion. Only the chosen entry should change.
5. Search for nonsense and use Show all albums. Check collection/wishlist empty states and an invalid album URL.
6. Repeat navigation and forms at phone width, using keyboard focus and touch-size actions. Reduced-motion users should not get the upload flight or continuous featured spin.
7. In an isolated test profile only, simulate invalid diary JSON and quota/storage errors. Check backup download, no overwrite, visible feedback and retained form text.

Automated isolated-browser checks for this change also covered the above journey, disc-two track IDs, required ratings, future dates, storage-failure retry, corruption protection, login-preview Escape and no React runtime errors. Production build passed. These checks do not test a backend that does not yet exist.
