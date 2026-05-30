<h1 align="center">Postra</h1>

<p align="center">
  <strong>Zarządzaj social mediami po polsku.</strong><br/>
  Polish-first social media management — schedule, design, and publish across channels.
</p>

<p align="center">
  <a href="https://opensource.org/license/agpl-v3">
    <img src="https://img.shields.io/badge/License-AGPL%203.0-blue.svg" alt="License: AGPL-3.0">
  </a>
  <a href="https://postra.pl">
    <img src="https://img.shields.io/badge/web-postra.pl-38bdf8.svg" alt="postra.pl">
  </a>
</p>

---

## Czym jest Postra

Postra to narzędzie do zarządzania social mediami skrojone pod **polski rynek**: polski interfejs, ceny w PLN, zgodność z RODO. Planuj i publikuj posty na wielu platformach, twórz grafiki i karuzele w wbudowanym **Studio** (edytor + AI), i analizuj wyniki — wszystko z jednego miejsca.

- 🌐 Strona: **[postra.pl](https://postra.pl)**
- 🚀 Aplikacja: **[app.postra.pl](https://app.postra.pl)**

> Postra is a Polish-market social media management tool — Polish UI, PLN pricing, GDPR-aware. Schedule posts across channels, create graphics and carousels in the built-in **Studio** (canvas editor + AI), and track analytics in one place.

## Zbudowane na Postiz / Built on Postiz

Postra jest pochodną open-source projektu **[Postiz](https://github.com/gitroomhq/postiz-app)** (`gitroomhq/postiz-app`), na licencji **AGPL-3.0**. Zgodnie z AGPL-3.0 kod źródłowy Postry — wraz z naszymi modyfikacjami — jest publiczny w tym repozytorium. Ogromne podziękowania dla zespołu Postiz za fundament.

> Postra is a derivative of the open-source **[Postiz](https://github.com/gitroomhq/postiz-app)** project, under **AGPL-3.0**. Per the license, Postra's source — including our modifications — is public in this repository. Huge thanks to the Postiz team for the foundation.

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
