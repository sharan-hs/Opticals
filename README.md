# Vijai Opticians — website

Online store for Vijai Opticians, Bengaluru (Basaveshwar Nagar & Vijayanagar).

Currently a React single-page app with a static product catalogue and product images on Cloudinary. A FastAPI + PostgreSQL backend (accounts, cart, orders, payments, admin) is planned; see the architecture plan and task list in `docs/`.

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

Hosted on Netlify. `netlify.toml` sets the build command, publishes `build/`, rewrites all routes to `index.html` for client-side routing, and sets cache headers.

## Credits

3D model: "Eyewear (Specs)" by rojencha on Sketchfab, licensed under CC BY 4.0.
