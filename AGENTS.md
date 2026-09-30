# Repository notes

- This is a Bun workspace (`apps/*`); run commands from the repository root. `apps/server` and `apps/cli` are separate runnable projects.
- `apps/server/src/index.ts` exports a Hono app directly; Bun serves that default export. `bun run dev:server` uses `bun --hot`, while `bun run start:server` runs without hot reload.
- For Hono JSON routes, validate request bodies with `@hono/zod-validator` (`zValidator('json', schema)`) and read parsed data through `c.req.valid('json')`; `c.req.json<T>()` only asserts a type and does not validate input. For AI SDK chat requests, use Zod to validate the nonempty message envelope and `safeValidateUIMessages` to check the full `UIMessage` parts before passing the validated messages to `convertToModelMessages`; return 400 for invalid input.
- In all apps, validate data from external or untyped boundaries on the client too (for example, router location state, storage, and network responses) with Zod schemas before using it. Prefer `safeParse` when invalid or absent data needs a fallback; do not rely on TypeScript `as` assertions as validation. Avoid transformations such as trimming when the original user input must be preserved.
- `apps/cli/src/index.tsx` renders an interactive terminal UI with OpenTUI React, not browser DOM components. Its TS config uses `jsxImportSource: "@opentui/react"` (also declared in the entrypoint pragma).
- For OpenTUI work, invoke the `opentui` skill first and consult its React and task-specific references (inputs, keyboard, layout, testing, etc.). Check installed `node_modules` APIs only when the skill does not cover the question or installed-version behavior needs confirmation.
- OpenTUI React is real React with a custom terminal renderer. Its `<textarea>` is imperative, not a controlled React input: it has no `value`/`onChange`, `onSubmit` does not provide the text, and `onContentChange` does not provide the new content. Keep a `TextareaRenderable` ref and read `ref.current.plainText` on submit; use React state for derived UI such as textarea height rather than duplicating its text unless needed.
- Name source files in kebab-case (for example, `home-screen.tsx` and `home-textarea.tsx`), even when exported components use PascalCase.
- In the CLI, keep screen-level layouts in `src/screens/` and UI components in `src/components/`; keep `src/index.tsx` focused on renderer setup and mounting the screen.
- Keep the interactive CLI's root script on `bun run --cwd apps/cli start`. `--cwd` runs the script directly from the CLI directory so OpenTUI can control terminal output and keyboard input. Bun's `--filter` is a workspace script runner that can manage/format output; reserve it for non-interactive or multi-workspace scripts rather than full-screen TUI apps. This is a development-script choice, not a requirement for distributing the CLI.

## Commits

- For every commit, consult the `git-commit` skill and choose the message from the actual diff.
- Use Conventional Commit subjects in the format `<type>(<scope>): <imperative description>`. Use a relevant type, omit the scope when there is no useful one, and keep the subject under 72 characters.
- For commit bodies, separate the subject from the body with a blank line. Put each bullet on its own actual line; never encode line breaks as literal `\n` text. When using `git commit -m`, pass the body as a multiline shell string or use repeated `-m` options, one per paragraph.
- Keep each commit focused on one logical change and stage only the intended files.

## Commands

- Install: `bun install` (the workspace uses `bun.lock`).
- Run the CLI: `bun run start:cli`; run the server: `bun run dev:server` or `bun run start:server`.
- Check both workspaces: `bun run typecheck` (server first, then CLI). For a focused check: `bun run tsc --noEmit -p apps/server/tsconfig.json` or `bun run tsc --noEmit -p apps/cli/tsconfig.json`.
- There are no configured test or lint scripts; typecheck is the available repository-wide check.
