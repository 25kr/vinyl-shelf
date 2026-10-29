# Current implementation

Verified against source on 29 October 2026 at `a353afe`.

## Catalogue and interface
- Albums, genres, dates, covers, tracks and pressings are currently curated local frontend data.
- Main catalogue: `src/data/albums.js` plus imported addition files.
- Track listings: `src/data/tracklists.json`, with disc-aware track identifiers.
- Vinyl appearance: `src/data/pressings.js`, additions and artwork JSON/assets. Some entries are verified, others explicitly illustrative.
- Catalogue/shelf filters persist while navigating away and back.
- Collection, wishlist and saved flags remain device/browser storage, not account-backed.

## Routes
Hash navigation in `src/App.jsx`: home, explore, collection, wishlist, diary, diary/review, album/:id and profile/:numeric-id.

## Accounts and profiles
Invite-only signup, login/logout, case-insensitive unique usernames enforced by a database constraint. Admin account intended to be only `29kr`; no general signup admin privileges.

Profiles show a bio, avatar, banner, reviews and follower/following counts. Other member profiles have Follow/Unfollow. Counts open paginated member lists. Names and review avatars link to profiles.

Editor includes photo preview, camera control, banner upload and position/zoom cropping. Source images limited to JPG/PNG/WebP, 2 MB each and 12 megapixels. Backend re-encodes avatars to 256×256 JPEG and banners to 1200×400 JPEG, stripping source metadata. Small image bytes are stored in the database to survive Render container replacement. Image endpoints require membership.

Code: `backend/accounts/models.py`, `profiles.py`, `views.py`, `forms.py`; `src/components/ProfilePage.jsx`, `ProfileEditor.jsx`, `BannerPicker.jsx`, `PhotoCropper.jsx`, `LoginDialog.jsx`.

## Diary and social features
Reviews can target an album or a specific track. Rating required; listening date and review text optional. No demo reviews. No repeat-listen checkbox. Review owner edits/deletes; other users cannot modify another user's review through the public API.

Likes/dislikes: one reaction per member/review, switch or clear it. Currently thumbs emojis. User subsequently requested TikTok-like monochrome icons, then deferred that discussion to add replies; icon choice remains unresolved.

Comments: member-only, plain text, up to 1,000 characters, pagination and retry-safe client IDs. Users can delete their own comments.

Replies: one level beneath a top-level comment, expandable threads, own-reply deletion. Parent and reply must belong to the same review. Deleting a parent soft-deletes its text and retains a placeholder when visible replies remain. Deleting a review removes its comments/reactions.

Code: `backend/reviews/models.py`, `views.py`, `social.py`, `urls.py`; `src/components/ReviewCard.jsx`, `ReviewSocial.jsx`, `CommentReplies.jsx`, `ListeningDiary.jsx`; `src/lib/reviews.js`.

## API paths
- `/api/health/`
- `/api/auth/session/`, `login/`, `signup/`, `logout/`
- `/api/auth/profile/` — own profile multipart update
- `/api/auth/profiles/<id>/`, `avatar/`, `banner/`, `follow/`, `followers/`, `following/`
- `/api/reviews/`, `<review UUID>/`
- `/api/reviews/<UUID>/reactions/`
- `/api/reviews/<UUID>/comments/` — root comments; `?parent=<comment id>` for replies
- `/api/reviews/<UUID>/comments/<comment id>/` — own deletion

React uses same-origin cookies and refreshes CSRF tokens before writes. No React Router; do not replace navigation casually.
