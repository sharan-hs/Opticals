# Phase 4 (accounts and login): what to check

Branch: `phase2/backend-foundation`. Run both apps (two terminals):

```bash
cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev     # http://localhost:3000
```

In development no real emails are sent: they're printed in the **backend terminal**, including the password-reset link.

## Sign up and sign in
- [ ] Header person icon → Login page with Login / Register tabs
- [ ] Register with an empty form → messages under each field
- [ ] Register with password `password123` → "This password is too easy to guess" under the password
- [ ] Register properly (mobile like `97313 07237`) → lands on My Account, toast "Your account is ready"
- [ ] Reload the page → still signed in
- [ ] Register again with the same email in capitals → "An account with this email already exists."
- [ ] Log out (header menu or account page), then log in with a wrong password → "Incorrect email or password."
- [ ] Wrong password 6 times within a minute → "Too many attempts…"; works again after a minute
- [ ] Open http://localhost:3000/account/addresses while signed out → Login; after logging in you land on Addresses

## My Account
- [ ] Profile: change name / mobile → "Profile saved"; the header menu greets you by first name
- [ ] Addresses: add one → marked **Default**; add a second and press **Make default** on it; edit one; delete the default → the other becomes default
- [ ] Address validation: pincode `056007`, empty street, no state → messages under the fields
- [ ] Password & security: wrong current password → message under that field; correct → "Password changed"
- [ ] Sign in on a second browser (or incognito), change the password in the first → reload the second: it's signed out; the first stays signed in (an open page keeps working for up to 15 minutes until its access token expires)
- [ ] "Log out on all devices" signs out everywhere

## Forgot password
- [ ] Login → "Forgot your password?" → enter your email → confirmation message (same message for an unknown email)
- [ ] Copy the link from the backend terminal, open it, set a new password → back to Login; the new password works, the old one doesn't
- [ ] Open the same link again → "This reset link is invalid or has expired"

## Admin account
```bash
cd backend && uv run python -m app.cli create-admin
```
- [ ] Prompts for email, name, password (hidden). Log in with it; `GET /api/v1/me` shows `"role": "ADMIN"` (admin screens arrive in Phase 5)

## Phone layout
- [ ] DevTools at 390 px: login, register, account pages fit without sideways scrolling; the mobile menu shows "Log in / Register" or "My Account" + "Log out"

## Not in this phase
- Cart stays in the browser and isn't linked to the account yet (Phase 7).
- Email verification and real email delivery (Resend) are set up at deployment.
