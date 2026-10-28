# Vinyl Shelf

A React music collection project with album and track reviews and a listening diary.

Live preview: https://25kr.github.io/vinyl-shelf/

## Run locally

```sh
npm install
npm run dev
```

On PowerShell, use `npm.cmd` if the system blocks `npm.ps1`.

## Build and publish

`npm run build` creates a local production build in `dist/`.
`npm run build:pages` builds for the `/vinyl-shelf/` GitHub Pages address.

Pushing to `main` runs the GitHub Pages deployment workflow automatically.
Album artwork uses Vite's base URL so it works locally and on GitHub Pages.

This is an early preview. Accounts are not connected yet; collections, reviews,
and diary entries are saved in each visitor's own browser and are not shared.

## Backend (local development)

The Django foundation is in `backend/`. Run `npm.cmd run backend` in a second
terminal alongside Vite. See [backend setup](backend/README.md) for instructions.
Accounts are not connected to the frontend yet; the public demo still uses
browser storage.
