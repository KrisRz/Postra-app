<h1 align="center">Postra</h1>

<p align="center">
  <strong>All your social media in one place.</strong><br/>
  Schedule, design, and publish across every channel — built for modern teams and creators.
</p>

<p align="center">
  <a href="https://opensource.org/license/agpl-v3">
    <img src="https://img.shields.io/badge/License-AGPL%203.0-blue.svg" alt="License: AGPL-3.0">
  </a>
  <a href="https://postra.co.uk">
    <img src="https://img.shields.io/badge/web-postra.co.uk-38bdf8.svg" alt="postra.co.uk">
  </a>
</p>

---

## What is Postra

Postra is a social media management tool for the UK market. Plan and publish posts across multiple platforms, create graphics and carousels in the built-in **Studio** (canvas editor + AI), and track your analytics — all from one place.

- 🌐 Website: **[postra.co.uk](https://postra.co.uk)**
- 🚀 App: **[app.postra.pl](https://app.postra.pl)**

Connect Facebook, Instagram, TikTok, LinkedIn and YouTube, schedule your content, and let Postra publish it on time — with English UI and UK-aware data protection.

## Built on Postiz

Postra is a derivative of the open-source **[Postiz](https://github.com/gitroomhq/postiz-app)** project (`gitroomhq/postiz-app`), licensed under **AGPL-3.0**. In line with the AGPL-3.0, Postra's source — including our modifications — is public in this repository. Huge thanks to the Postiz team for the foundation.

## Stack

- **Frontend:** Next.js + React
- **Backend:** NestJS
- **Scheduler:** Temporal
- **DB / cache:** PostgreSQL + Redis
- **AI:** OpenAI (GPT / image / Whisper) for Studio generation, refine, captions
- **Infra:** AWS (EC2, RDS, ALB, ECR, S3, CloudFront) — managed in the private infra repo

## Monorepo

```
apps/
  frontend/      # Next.js app (UI, Studio design editor)
  backend/       # NestJS API
  orchestrator/  # Temporal workflows & activities
libraries/       # shared services (DB/Prisma, OpenAI, studio, upload, …)
```

Built with **pnpm**. See `CLAUDE.md` for repo conventions.

## Development

```bash
pnpm install
docker compose -f docker-compose.dev.yaml up -d   # Postgres, Redis, Temporal
cp .env.example .env                               # fill in required vars
pnpm run prisma-db-push
pnpm run dev                                        # frontend :4200, backend :3000
```

## License

This repository's source code is available under the [AGPL-3.0 license](LICENSE). See [NOTICE](NOTICE) for attribution to the upstream Postiz project.
