# Attribution

This project uses the following open-source libraries and draws inspiration from the following projects.

## Libraries

### Excalidraw
- **Website:** https://excalidraw.com/
- **License:** MIT
- **Usage:** Whiteboard/drawing editor component (`@excalidraw/excalidraw`)
- Used as an npm package via its public API. No source code was copied or modified.

### CodeMirror 6
- **Website:** https://codemirror.net/
- **License:** MIT
- **Usage:** Markdown editor foundation (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, etc.)
- Used as npm packages via the official extension API (Decoration, ViewPlugin, StateField, etc.). No source code was copied or modified.

### Lezer
- **Website:** https://lezer.codemirror.net/
- **License:** MIT
- **Usage:** Markdown parsing for Live Preview (`@lezer/markdown`, `@lezer/highlight`)

### Next.js
- **Website:** https://nextjs.org/
- **License:** MIT
- **Usage:** Application framework (App Router, Server Components)

### Prisma
- **Website:** https://www.prisma.io/
- **License:** Apache-2.0
- **Usage:** Database ORM for PostgreSQL

### NextAuth.js (Auth.js)
- **Website:** https://authjs.dev/
- **License:** ISC
- **Usage:** Authentication (Credentials, OAuth providers)

### Tailwind CSS
- **Website:** https://tailwindcss.com/
- **License:** MIT
- **Usage:** Utility-first CSS framework

### Radix UI
- **Website:** https://www.radix-ui.com/
- **License:** MIT
- **Usage:** Headless UI primitives (Dialog, Tabs, Select, Popover, etc.)

## Design Inspiration

### Obsidian
- **Website:** https://obsidian.md/
- **License:** Proprietary (closed source)
- **Influence:** The Live Preview editing experience — where Markdown syntax is hidden on non-cursor lines and rendered inline — was conceptually inspired by Obsidian's approach.
- **Implementation:** Built entirely with CodeMirror 6's public Decoration API. No code was copied from Obsidian, which is closed-source software. The theme naming (`obsidianTheme`, `obsidianHighlighting`) reflects the design inspiration only.
