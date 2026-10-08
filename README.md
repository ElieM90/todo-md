# todo-md

A Claude Code mod that turns your project's `todo.md` into a live checklist pane. Add tasks, tick them off and track progress without leaving the session, while the file stays plain Markdown that you (and Claude) can edit by hand.

<p align="center"><img src="docs/screenshot.png" alt="The Todos pane in Claude Code: progress bar, add field, All/Open/Done filters and a Markdown-rendered task list" width="420"></p>

- **Pane**: progress bar, All / Open / Done filters, one-click toggles, *Clear completed*
- **Markdown**: task text renders bold, `code` and links
- **Quick add**: `/todo <text>` from the prompt, one task per line
- **Status line**: always shows how many tasks are open
- **Stays in sync**: picks up edits made by hand or by Claude after every turn

Works in the Claude Code desktop app (Code tab) and the terminal.

## Install

In Claude Code:

```
/plugin install todo-md --marketplace ElieM90/todo-md
```

Then start a new session. Installed plugins load when a session starts.

## Usage

| Command | What it does |
| --- | --- |
| `/todo` or `/todo open` | Open the Todos pane |
| `/todo <text>` | Add a task to `todo.md` |
| `/todo` + several lines | Add one task per line (Shift+Enter for new lines) |

In the pane:

- Type in **Add a task…** and press Enter or click **Add**. Pasting several lines adds several tasks.
- Click **○** to mark a task done, **✔** to reopen it.
- Switch between **All**, **Open** and **Done** to filter.
- **Clear completed** deletes every done task from the file.

The status line under the prompt shows `☰ 3 open · /todo open`, `☰ ✓ all done`, or a hint while the list is empty.

You can also just ask Claude, e.g. *"mark the SSO task done in todo.md"* or *"what's left in todo.md?"*. The pane updates when the turn ends.

## The `todo.md` file

The mod reads and writes `todo.md` in the session's working directory and creates it on the first add. Any Markdown list line counts as a task:

```markdown
# Sprint

- [ ] Review open pull requests
- [x] Archive last sprint board
- Schedule weekly sync          ← no checkbox: treated as open
* [ ] **Bold**, `code` and [links](https://example.com) render in the pane
```

- `[x]` or `[X]` means done; `[ ]` or no box means open.
- Headings, paragraphs and other lines are kept as they are and never shown.
- Pasted `- [ ] ` / `* ` prefixes are stripped when adding, so copying a list in just works.

Tip: add `todo.md` to your project's `.gitignore` if the list is personal.

## Updating

```bash
claude plugin marketplace update todo-md
```

```bash
claude plugin update todo-md@todo-md
```

Then start a new session.

## Development

```
.claude-plugin/   plugin.json (name, version) and marketplace.json
hooks/            register.tsx (command, pane, status line) and todos.ts (parsing)
types/            state contract for the pane's values
```

Check and test from the repo root:

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

To try changes live, copy the folder into a session's mods folder and enable hot reloading when Claude Code asks, or start a session with `claude --plugin-dir <path to this folder>`.

Bump `version` in `.claude-plugin/plugin.json` with every release. Installed copies only update when it changes.

## Limitations

- The pane is drawn with Claude Code's built-in elements, so fonts, corner radii and button colours follow the app's theme. The palette is tuned for dark theme.
- The terminal shows a block-character progress bar instead of the graphic one.
- A task whose whole text is `open` can't be added with `/todo open`; use the pane instead.
