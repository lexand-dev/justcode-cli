# Repository notes

- This is a Bun workspace (`apps/*`); run commands from the repository root. `apps/server` and `apps/cli` are separate runnable projects.
- `apps/server/src/index.ts` exports a Hono app directly; Bun serves that default export. `bun run dev:server` uses `bun --hot`, while `bun run start:server` runs without hot reload.
- `apps/cli/src/index.tsx` renders an interactive terminal UI with OpenTUI React, not browser DOM components. Its TS config uses `jsxImportSource: "@opentui/react"` (also declared in the entrypoint pragma).
- For OpenTUI work, invoke the `opentui` skill first and consult its React and task-specific references (inputs, keyboard, layout, testing, etc.). Check installed `node_modules` APIs only when the skill does not cover the question or installed-version behavior needs confirmation.
- OpenTUI React is real React with a custom terminal renderer. Its `<textarea>` is imperative, not a controlled React input: it has no `value`/`onChange`, `onSubmit` does not provide the text, and `onContentChange` does not provide the new content. Keep a `TextareaRenderable` ref and read `ref.current.plainText` on submit; use React state for derived UI such as textarea height rather than duplicating its text unless needed.
- Name source files in kebab-case (for example, `home-screen.tsx` and `home-textarea.tsx`), even when exported components use PascalCase.
- In the CLI, keep screen-level layouts in `src/screens/` and UI components in `src/components/`; keep `src/index.tsx` focused on renderer setup and mounting the screen.
- Keep the interactive CLI's root script on `bun run --cwd apps/cli start`. `--cwd` runs the script directly from the CLI directory so OpenTUI can control terminal output and keyboard input. Bun's `--filter` is a workspace script runner that can manage/format output; reserve it for non-interactive or multi-workspace scripts rather than full-screen TUI apps. This is a development-script choice, not a requirement for distributing the CLI.

## Commands

- Install: `bun install` (the workspace uses `bun.lock`).
- Run the CLI: `bun run start:cli`; run the server: `bun run dev:server` or `bun run start:server`.
- Check both workspaces: `bun run typecheck` (server first, then CLI). For a focused check: `bun run tsc --noEmit -p apps/server/tsconfig.json` or `bun run tsc --noEmit -p apps/cli/tsconfig.json`.
- There are no configured test or lint scripts; typecheck is the available repository-wide check.
