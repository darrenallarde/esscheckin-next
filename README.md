# Sheepdoggo

Student engagement platform for youth ministries.

## Quick Start

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Documentation

See the [`/docs`](./docs/README.md) folder for comprehensive documentation:

- [Getting Started](./docs/getting-started.md) — Developer onboarding
- [Architecture](./docs/architecture.md) — System design
- [Database](./docs/database.md) — Schema reference
- [API Reference](./docs/api-reference.md) — Functions and endpoints
- [Feature Docs](./docs/features/) — Individual feature documentation
- [Roadmap](./docs/roadmap.md) — What's done and what's next

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── hooks/queries/    # TanStack Query hooks
├── lib/supabase/     # Supabase clients
├── types/            # TypeScript definitions
└── utils/            # Helper functions

docs/                 # Product documentation
├── features/         # Feature-specific docs
└── archive/          # Superseded docs

supabase/             # Database migrations and functions
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI:** shadcn/ui + Tailwind CSS
- **State:** TanStack Query
- **AI:** Anthropic Claude
- **SMS:** Twilio

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and debugging rules.

## License

Private — All rights reserved.
