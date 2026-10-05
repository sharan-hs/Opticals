# Adding product photos

For the shop owner. No technical knowledge needed.

## Steps
1. Log in on the website and open **Shop admin** (person menu, top right).
2. **Products** → click the product → **Photos** tab.
3. Under "For colour", pick which colour these photos show.
4. Tap **Choose photos…** and pick one or more photos. On a phone you can take a new photo or choose from the gallery.
5. A square window opens for each photo. **What's inside the square is exactly what customers see.**
   - It starts with the whole width of the photo in view. That usually looks right, so you can just press **Save photo**.
   - Drag the photo to move it. Use the zoom slider (or pinch on a phone) to zoom in or out.
   - **Show whole photo** zooms out until the entire photo fits. Any empty space becomes white.
   - If you picked several photos, **Skip this one** leaves that photo out.
6. The first photo is the **main photo** in the shop. Use **Make main photo** and the ← → buttons to change it and the order.

Any shape or size of photo works: every photo is made square and white-backed, so the shop always looks even. If a photo is too small to look sharp, the square window says so.

## For the best-looking photos
- Plain **white** background: a sheet of white paper or card is enough.
- Good **daylight**, without strong shadows. Turn off the flash.
- Show the **whole frame**, from one temple tip to the other, with a little space around it.
- Take several angles: front, side (to show the temple), and a three-quarter view.
- One pair of glasses per photo.

## Before this works (one-time setup by Sharan)
Uploading needs the shop's Cloudinary **API key** and **API secret**. They are under Cloudinary → Settings → API Keys, and go in the backend settings (`backend/.env` locally, and the API project's environment variables on Vercel). Until then, the Photos tab says uploads aren't switched on yet.
