# Vinyl Shelf — start here

Updated: 29 October 2026. The implementation checkpoint before this session was `5cfc77b`; see the work log for current changes.

This folder is an Obsidian-compatible project notebook. Open it as a vault or open the Markdown files normally. No Obsidian plugin is required. These notes summarize durable decisions, not a verbatim transcript. Source code and live checks take precedence over stale notes.

## Read these first
- [[01 Project and Preferences]] — purpose, stack, user preferences and accepted decisions.
- [[02 Current Implementation]] — working features and code map.
- [[03 Running and Deployment]] — local startup and hosting.
- [[04 Security and Limitations]] — controls, unresolved work and audit boundaries.
- [[05 Music API Plan]] — replacing manual album entry; proposed, not implemented.
- [[06 Work Log and Next Steps]] — latest commits and next actions.

## Current work
The user wants automatic music catalogue search instead of manually adding albums. The first requested implementation step is Django MusicBrainz search. The first backend catalogue-search endpoint is now implemented; the React search interface and album import remain next.

## Maintaining continuity
At the end of a meaningful change, update affected notes and the work log. Before continuing in a new chat, read this index and relevant pages, then verify the repository state. A notebook reduces repeated context recovery; it does not disable automatic chat context limits or guarantee that every future chat reads it.

Do not store passwords, invite codes, API tokens, session cookies, personal emails, or database contents here. These notes may be public in GitHub.
