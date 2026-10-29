# Music API plan

Status: proposal researched 29 October 2026; NOT implemented. Current catalogue is still manually curated frontend data.

## What the user means
The user wants visitors to search for music and fetch album details automatically rather than the developer adding every album by hand. Treat this as catalogue metadata (albums/artists/tracks/covers), not permission to upload or stream commercial audio. Actual playback is a separate feature with provider and rights requirements.

## Proposed first provider
MusicBrainz for album/artist/release/track metadata. It supports JSON searches, requires a meaningful User-Agent, and currently does not require an API key. Its documentation distinguishes non-commercial free use from commercial service arrangements. Respect its documented request limits and terms.

Use Cover Art Archive as a candidate source for cover images; validate current endpoint documentation, usage terms and missing-art behaviour before implementation. Not all releases have artwork.

Discogs is a candidate for physical release/pressing information, formats, editions and community images. Confirm its current authentication, terms, image permissions and rate limits before integrating. Do not promise perfect coverage or automated accurate centre labels.

## Flow
1. Visitor searches an album/artist in React.
2. React asks our Django search endpoint.
3. Django queries the provider with bounded input, timeout, rate limiting and caching.
4. Visitor selects the correct album and, where relevant, edition.
5. Django imports/updates the selected record into our catalogue, using stable provider IDs and avoiding duplicates.
6. React displays the album and tracks. Reviews reference the saved catalogue record.

Fetch as needed; do not download an entire provider catalogue. Keep credentials in backend environment settings if a provider needs them. Cache repeated searches in Redis and store selected album data in PostgreSQL. Start with member-only import to prevent anonymous catalogue spam; public search policy can be decided later.

## Data model proposal
Artist, Album (work/release group), Release/Edition, Disc and Track. Store provider IDs, attribution/source URLs and retrieval timestamps. Separate an album from specific physical pressings: one album can have multiple colours/editions or no known vinyl.

Keep existing local album IDs as legacy aliases or another stable mapping. Existing reviews use album strings, track IDs use disc-number pairs, and shelf flags are browser-local: migrate without orphaning reviews or users' existing shelves. Avoid swapping the whole catalogue in one step.

## Vinyl art
Keep our React vinyl animation. Exact disc colour/centre label belongs to a particular pressing, not the generic album. Import verified information when present, retain curated overrides for the current catalogue, and use a clearly illustrative fallback when unknown. Album-cover art alone cannot reliably recreate authentic label artwork.

## Suggested implementation order
1. Provider adapter and server-side cached search; validate real responses.
2. Catalogue models/import and legacy-ID mapping.
3. Album selection screen with edition disambiguation.
4. Dynamic album/track pages and existing-review compatibility.
5. Physical pressing enrichment and curated artwork overrides.

## Primary references
- https://musicbrainz.org/doc/MusicBrainz_API
- https://musicbrainz.org/doc/MusicBrainz_API/Search
- https://musicbrainz.org/doc/Web_Service
- https://musicbrainz.org/doc/Cover_Art_Archive/API
- https://www.discogs.com/developers
- https://github.com/discogs/discogs_client/blob/master/docs/quickstart.md

The direct Cover Art Archive documentation request returned 429, and Discogs developer portal returned 403 during this session. Recheck before claiming current endpoint details have been verified. MusicBrainz API/search documentation was accessible.
