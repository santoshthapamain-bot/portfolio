# Portfolio Website (Node.js + Express + SQLite)

A complete, single-folder portfolio site — no separate client/server. One Express
app serves the public pages (server-rendered with EJS), the admin dashboard, and
the JSON API that powers it, all backed by a local SQLite database file.

## Pages
- **Home** — hero (3D animated), about summary, projects preview, contact, footer
- **About** — second hero (photo marquee), bio, skills, education, hobbies, trainings
- **Projects** — full grid of projects with 3D hover-tilt cards
- **Contact Us** — social links, email, phone, contact form (saved to the database)
- **Admin Login** — email/password login + forgot/reset password flow
- **Dashboard** — manage every piece of content on the site

## Tech
- Node.js + Express (single app, no client/server split)
- SQLite via `better-sqlite3` (one local file, zero setup, no external DB server)
- EJS templates for server-rendered pages
- `express-session` + `bcryptjs` for admin auth
- `multer` for image uploads (stored in `public/uploads`)
- Three.js (CDN) for the 3D hero "constellation" animation, plus CSS scroll-reveal
  animations and 3D hover-tilt on project cards — no build step required

## Setup

```bash
cd portfolio
npm install
npm start
```

Then open:
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login

On first run, a default admin account is created and printed in the terminal:

```
email:    admin@example.com   (or DEFAULT_ADMIN_EMAIL in .env)
password: Admin@123           (or DEFAULT_ADMIN_PASSWORD in .env)
```

**Log in and change this password immediately** from Dashboard → Security, or set
your own values in `.env` before the first run.

## Environment variables (`.env`)
```
PORT=3000
SESSION_SECRET=change-this-to-a-long-random-string-in-production
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=Admin@123
```

## Everything is editable from the Dashboard
- **Profile & Hero** — name, role, bio, personal profile photo, resume link
- **Hero Photos** — upload multiple images used in the homepage hero / about marquee
- **Skills** — title + image/icon for each
- **Education** — degree, institution, year, description
- **Hobbies** — title + emoji icon
- **Trainings** — title, organization, year, description
- **Projects** — title, description, preview image, link, tags — shown in the grid
- **Social Links** — platform + URL (GitHub, LinkedIn, X, etc.)
- **Contact Info** — public email, phone, address
- **Messages** — view and manage everything submitted through the Contact Us form
- **Security** — change the admin password

## Forgot password
Since no email/SMTP service is configured out of the box, "Forgot password" shows
the reset link directly on screen (and logs it to the server console) instead of
emailing it. To send it by email in production, wire up `nodemailer` inside
`routes/admin.js` at the `/admin/forgot-password` route.

## Project structure
```
portfolio/
  server.js               # app entry point
  db/database.js          # SQLite schema + seed data
  middleware/auth.js       # dashboard auth guard
  utils/upload.js          # multer image upload config
  routes/
    public.js              # Home / About / Projects / Contact
    admin.js                # login / logout / forgot / reset / dashboard page
    api.js                  # JSON API used by the dashboard (CRUD)
  views/                   # EJS templates
  public/
    css/style.css
    js/main.js              # 3D hero + scroll reveals + tilt cards
    js/dashboard.js         # dashboard CRUD logic
    uploads/                # uploaded images land here
```

## Notes
- Database file lives at `db/portfolio.sqlite` (auto-created on first run).
- Sessions are stored in the same SQLite database (`better-sqlite3-session-store`), so logins survive server restarts. This also avoids pulling in the separate native `sqlite3` package, which conflicts with `better-sqlite3` on some systems (notably Windows).
- All uploaded images are stored in `public/uploads` and served statically.
