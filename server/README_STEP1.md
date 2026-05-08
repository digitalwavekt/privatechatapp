# PVChat Step 1: Backend + Supabase DB Patch

## Apply order

1. Backup your current `server/src` folder.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Replace/add these files in backend:
   - `src/index.js`
   - `src/config/supabase.js`
   - `src/utils/mapper.js`
   - `src/utils/jwt.js`
   - `src/utils/initAdmin.js`
   - `src/utils/notifications.js`
   - `src/middleware/auth.js`
   - all files inside `src/controllers/`
   - `src/socket/handler.js`
4. Keep existing `src/routes/` files or use included route files.
5. Replace `.env.example`, then create real `.env`.
6. Run:

```bash
npm install
npm run dev
```

7. Test:

```bash
GET http://localhost:5000/api/health
POST http://localhost:5000/api/auth/register
POST http://localhost:5000/api/auth/login
```

## Important env note

Use `SUPABASE_SERVICE_ROLE_KEY` only in backend/Render. Never add it to React/Vercel.

## Admin login

Admin seed is created from:

```env
ADMIN_EMAIL=admin@pvchat.com
ADMIN_PASSWORD=ChangeThisStrongPassword123!
ADMIN_PHONE=0000000000
```

## MVP storage note

`chat-media` bucket is public in this Step 1 patch so your existing React client can display media URLs directly. In the next security phase, switch bucket to private and serve signed URLs through backend.
