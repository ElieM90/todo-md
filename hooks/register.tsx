import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { append, clearDone, locate, parse, toggle } from './todos'

const FILE = 'todo.md'
const PANE = 'todo-md'
const todos = atom({ plugin: 'todo-md', key: 'todos' } as const, [])

// null: the project has no todo.md
const readFile = ($: EngineInterface) => $.fs.read(FILE).then(t => t as string, () => null)
const load = async ($: EngineInterface) => (await readFile($)) ?? ''

const refresh = async ($: EngineInterface) => {
  const md = await readFile($)
  const list = parse(md ?? '')
  await update($, todos, () => list)
  const open = list.filter(t => !t.done).length
  // no status line in projects without a todo.md: the plugin is installed for every project
  await $.ui.status(md === null ? undefined : !list.length ? '☰ no todos · /todo <text>' : open ? `☰ ${open} open · /todo open` : '☰ ✓ all done')
}

const add = async ($: EngineInterface, text: string) => {
  const md = await load($)
  const next = append(md, text)
  if (next === md) return
  await $.fs.write(FILE, next)
  await refresh($)
}

// the file may have changed since the pane was drawn: find the row by its text, not only its position
const flip = async ($: EngineInterface, index: number, text: string) => {
  const md = await load($)
  const at = locate(parse(md), index, text)
  if (at >= 0) await $.fs.write(FILE, toggle(md, at))
  await refresh($)
}

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: 'Todos' })

// /todo review, tidy and check hand the work to Claude as an ordinary prompt
const ASK = {
  review: `Review ${FILE} in the project root and tell me what to start with. Read it first, then:
- Pick the 1-3 open tasks I should do first, each with a one-line reason (unblocks other tasks, quick win, urgency, risk).
- Point out any task that is unclear or too big, and suggest how to split it.
- Keep it short. Do not edit the file.`,
  tidy: `Tidy up ${FILE} in the project root without losing any task. Read it first, then:
- Make every task a consistent "- [ ] " or "- [x] " line, fix indentation, trim stray whitespace and collapse extra blank lines.
- Keep each task's done/open state, its wording (fixing obvious typos and formatting only), the existing headings and the order.
- Look for tasks that mean the same thing, even when worded differently. Do not remove any yourself: list each likely duplicate pair and ask me which one to keep (or whether to merge them), then apply my answer.
- Finish with a short summary of what changed.`,
  check: `Check which open tasks in ${FILE} (project root) are already done. Read it first, then for each open task look for evidence in this project: the code, tests, config, docs and recent git history.
- Mark a task done ("[ ]" to "[x]") only when the evidence clearly shows it is complete, and cite that evidence in one line (file:line or commit).
- Do not mark tasks that are partly done or that you can't verify; list them separately with what is still missing.
- Change nothing else in the file: no rewording, reordering or removing.
- Finish with a short summary: marked done, still open, unclear.`,
}

type Filter = 'all' | 'open' | 'done'
const filter = atom({ plugin: 'todo-md', key: 'filter' } as const, 'all' as Filter)

const clear = async ($: EngineInterface) => {
  await $.fs.write(FILE, clearDone(await load($)))
  await refresh($)
}

const draft = atom({ plugin: 'todo-md', key: 'draft' } as const, '')

const submit = async ($: EngineInterface, text: string) => {
  await add($, text)
  await update($, draft, () => '')
}

// text follows the person's theme (light or dark); the mockup's orange is the one fixed colour
const C = { accent: '#F0883E', text: 'text', soft: 'inactive', faint: 'subtle', border: 'subtle', track: '#8E8E9455' } as const

// thin rounded progress bar; desktop only (the terminal gets a block-character bar)
const bar = (pct: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 8" preserveAspectRatio="none">`
  + `<rect width="1000" height="8" rx="4" fill="${C.track}"/>`
  + (pct ? `<rect width="${pct * 10}" height="8" rx="4" fill="${C.accent}"/>` : '') + `</svg>`
const RULE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1" preserveAspectRatio="none"><rect width="1000" height="1" fill="${C.track}"/></svg>`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'todo', description: 'todo.md: /todo open · /todo <text> to add · /todo review · /todo tidy · /todo check' })
    await refresh($)
    return next(e)
  })

  // todo.md may be edited by hand or by Claude between turns
  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('command.run', { command: 'todo' }, async ($, e) => {
    const args = e.args.trim()
    if (Object.hasOwn(ASK, args)) {
      if ((await readFile($)) === null) return { text: `No ${FILE} in this project yet. Add a task with /todo <text>.` }
      // a command hook can't queue a turn while it runs: submit just after it returns
      $.clock.after(0, () => void $.prompt.submit({ text: ASK[args as keyof typeof ASK], asUser: true })
        .catch(() => $.ui.toast(`Couldn't send /todo ${args} to Claude. Try again when the current turn ends.`)))
      return { text: `Asking Claude to ${args} ${FILE}…` }
    }
    if (args && args !== 'open') {
      await add($, e.args)
      return { text: `Added to ${FILE}.` }
    }
    await refresh($)
    await openPane($)
    return { text: 'Todos pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, todos)
    const show = await read($, filter)
    const rows = list.map((item, i) => ({ ...item, i }))
    const nDone = rows.filter(r => r.done).length
    const nOpen = rows.length - nDone
    const pct = rows.length ? Math.round((nDone / rows.length) * 100) : 0
    const shown = rows.filter(r => show === 'all' || (show === 'done') === r.done)

    const tab = (id: Filter, label: string, n: number) => (
      <Button key={`tab-${id}`} {...(show === id ? { variant: 'secondary' as const } : { plain: true as const })}
        label={`${label} ${n}`} onPress={() => update($, filter, () => id)} />
    )

    const text = await read($, draft)

    return (
      <Box flexDirection="column" paddingX={1} gap={1}>
        <Box>
          <Box borderStyle="round" borderColor={C.border} paddingX={1}>
            <Text color={C.soft}>🗎 {FILE}</Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Text color={C.soft}><Text color={C.text} bold>{nOpen}</Text> open · <Text color={C.text} bold>{nDone}</Text> done</Text>
            <Text color={C.soft}>{pct}%</Text>
          </Box>
          {'Svg' in ui
            ? <ui.Svg key="bar" source={bar(pct)} alt={`${pct}% done`} height={6} />
            : <Text><Text color={C.accent}>{'█'.repeat(Math.round(pct / 5))}</Text><Text color={C.faint}>{'░'.repeat(20 - Math.round(pct / 5))}</Text></Text>}
        </Box>

        {'Input' in ui && (
          <Box borderStyle="round" borderColor={C.border} paddingX={1} gap={1} alignItems="center">
            <Text color={C.faint}>+</Text>
            <Box flexGrow={1}>
              <ui.Input key="new" placeholder="Add a task…" submitLabel="↵" value={text} autoFocus
                onInput={(v: string) => update($, draft, () => v)} onSubmit={(v: string) => submit($, v)} />
            </Box>
            <Button key="add" variant="primary" label="Add" onPress={() => submit($, text)} />
          </Box>
        )}

        <Box gap={1}>
          {tab('all', 'All', rows.length)}
          {tab('open', 'Open', nOpen)}
          {tab('done', 'Done', nDone)}
        </Box>

        <Box flexDirection="column" gap={1}>
          {shown.length === 0 && (
            <Box flexDirection="column" alignItems="center" paddingY={2}>
              <Text color={C.text}>Nothing here</Text>
              <Text color={C.soft}>{show === 'done' ? 'Completed tasks will show up here.' : 'Add a task above to get started.'}</Text>
            </Box>
          )}
          {shown.map(r => (
            <Box key={`row${r.i}`} gap={1}>
              <Button key={`done${r.i}`} plain label={r.done ? '✔' : '○'} onPress={() => flip($, r.i, r.text)} />
              <Box flexGrow={1} flexShrink={1}>
                <ui.Markdown key={`md${r.i}`} text={r.done ? `~~${r.text}~~` : r.text} dimColor={r.done} />
              </Box>
            </Box>
          ))}
        </Box>

        {'Svg' in ui && <ui.Svg key="rule" source={RULE} alt="" height={1} />}
        {nDone > 0 && (
          <Box justifyContent="flex-end">
            <Button key="clear" variant="secondary" label="Clear completed" onPress={() => clear($)} />
          </Box>
        )}
      </Box>
    )
  })
}
