# Project and preferences

## Purpose
Vinyl Shelf (brand: shelf.) is a music and vinyl community project for learning React, a CV/LinkedIn portfolio, and an invite-only private beta. People explore albums, manage a shelf, write listening diary reviews, and connect with other listeners. Personal stories about discovering records belong in reviews rather than a separate album-page story form.

## Stack
- Frontend: React with JavaScript, Vite, HTML/JSX and CSS. Next.js is explicitly out of scope.
- Backend: Django with Python. The user settled on Django after considering alternatives.
- Production: PostgreSQL and Redis-compatible Valkey on Render; same-origin React/Django deployment.
- Local development: SQLite and a Python virtual environment.

## Communication and workflow
- User is a beginner. Explain in simple language, with concrete examples.
- Mark React-specific teaching with “(using React)”.
- User authorizes committing and pushing at sensible checkpoints; tell them BEFORE doing so.
- Do not use the user's screen unless authorized. Screen use has been specifically authorized for deployment work; don't assume all future UI tasks are authorized.
- Leave browser tabs open after work.
- Never invent a successful deployment: confirm Render's result.
- Preserve existing accounts, reviews and uploaded images.

## Design direction
A polished music website with large album covers, records partly emerging from sleeves, subtle spin and scrolling motion. Three records per row when space permits, responsive on phones. Background has soft animated colour rather than solid black. Featured vinyl changes on reload.

Diary is one shared review feed, with a separate review-writing route. Avoid oversized explanatory headers and unnecessary filters. Albums can exist without a confirmed vinyl pressing. Genres belong on album pages and support search.

## Figma
The user's girlfriend is a graphic designer and may redesign screens in Figma. Implement those designs in the existing React/CSS code; keep Django functionality. Figma is a design source, not an automatic replacement for React or automatic live synchronization. Obtain a shared file/node link and motion specifications or prototype before implementing. Follow the relevant Figma skills when working with actual designs.
