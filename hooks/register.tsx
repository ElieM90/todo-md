import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { append, clearDone, parse, toggle } from './todos'

const FILE = 'todo.md'
const PANE = 'todo-md'
const todos = atom({ plugin: 'todo-md', key: 'todos' } as const, [])

const load = ($: EngineInterface) => $.fs.read(FILE).then(t => t as string, () => '')

const refresh = async ($: EngineInterface) => {
  const list = parse(await load($))
  await update($, todos, () => list)
  const open = list.filter(t => !t.done).length
  await $.ui.status(!list.length ? '☰ no todos · /todo <text>' : open ? `☰ ${open} open · /todo open` : '☰ ✓ all done')
}

const add = async ($: EngineInterface, text: string) => {
  const md = await load($)
  const next = append(md, text)
  if (next === md) return
  await $.fs.write(FILE, next)
  await refresh($)
}

const flip = async ($: EngineInterface, index: number) => {
  await $.fs.write(FILE, toggle(await load($), index))
  await refresh($)
}

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: 'Todos' })

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

// ponytail: palette copied from the Todos panel mockup (dark only); map to theme keys if light theme matters
const C = { accent: '#F0883E', text: '#EDEDEF', soft: '#B4B4BA', muted: '#9B9BA1', faint: '#76767D', done: '#8A8A91', border: '#2E2E32', field: '#161618', chip: '#252528', track: '#2A2A2E' }

// thin rounded progress bar; desktop only (the terminal gets a block-character bar)
const bar = (pct: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 8" preserveAspectRatio="none">`
  + `<rect width="1000" height="8" rx="4" fill="${C.track}"/>`
  + (pct ? `<rect width="${pct * 10}" height="8" rx="4" fill="${C.accent}"/>` : '') + `</svg>`
const RULE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1" preserveAspectRatio="none"><rect width="1000" height="1" fill="${C.border}"/></svg>`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'todo', description: 'Open the todo.md pane (/todo open), or add items: /todo <text>' })
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
          <Box borderStyle="round" borderColor={C.border} backgroundColor={C.chip} paddingX={1}>
            <Text color={C.soft}>🗎 {FILE}</Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Text color={C.soft}><Text color={C.text} bold>{nOpen}</Text> open · <Text color={C.text} bold>{nDone}</Text> done</Text>
            <Text color={C.muted}>{pct}%</Text>
          </Box>
          {'Svg' in ui
            ? <ui.Svg key="bar" source={bar(pct)} alt={`${pct}% done`} height={6} />
            : <Text><Text color={C.accent}>{'█'.repeat(Math.round(pct / 5))}</Text><Text color={C.track}>{'░'.repeat(20 - Math.round(pct / 5))}</Text></Text>}
        </Box>

        {'Input' in ui && (
          <Box borderStyle="round" borderColor={C.border} backgroundColor={C.field} paddingX={1} gap={1} alignItems="center">
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
              <Text color={C.muted}>{show === 'done' ? 'Completed tasks will show up here.' : 'Add a task above to get started.'}</Text>
            </Box>
          )}
          {shown.map(r => (
            <Box key={`row${r.i}`} gap={1}>
              <Button key={`done${r.i}`} plain label={r.done ? '✔' : '○'} onPress={() => flip($, r.i)} />
              {r.done
                ? <Text color={C.done} strikethrough wrap="wrap">{r.text}</Text>
                : <Text color={C.text} wrap="wrap">{r.text}</Text>}
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
