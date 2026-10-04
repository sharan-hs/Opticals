# Vijai Opticians — frontend

Online store for Vijai Opticians, Bengaluru (Basaveshwar Nagar & Vijayanagar).

React single-page app with a static product catalogue and product images on Cloudinary. It will move onto the API in `../backend` (accounts, cart, orders, payments, admin); see `../docs/`.

## Setup

Requirements: Node.js 18.18+ (Node 22 LTS recommended) and npm.

```bash
npm install
npm run dev      # dev server on http://localhost:3000 (npm start also works)
npm run build    # production build in build/
npm run preview  # serve the production build locally
npm test         # unit tests (Vitest)
npm run lint     # ESLint, must pass with 0 warnings
```

Built with Vite. Environment variables must be prefixed with `VITE_` (see `.env.example`).

## Project structure

```
index.html         app shell (Vite entry)
public/            static files served as-is (icons, models/glasses.glb)
src/
  App.jsx          routes (pages are lazy-loaded)
  App/store.js     Redux store (cart persisted to localStorage)
  Features/Cart/   cart slice, persistence, add-to-cart hook
  Data/            static product catalogue and policy page text
  Config/          store contact details (single source)
  Utils/           Cloudinary URLs, price formatting, toasts, page titles
  Components/      UI components, grouped by page/section
  Pages/           route-level pages
  Assets/          local images
```

## Deployment

Hosted on Vercel (`vercel.json`): builds into `build/`, forwards `/api/*` to the backend, sends other routes to `index.html` for client-side routing, and sets cache headers. In development, `npm run dev` forwards `/api` to the backend on port 8000. See `../docs/DEPLOYMENT.md`.

## Credits

3D model: "Eyewear (Specs)" by rojencha on Sketchfab, licensed under CC BY 4.0.
