import { expect, test } from 'claude-code/testing'

// ponytail: props cast, the hooks read only hasSurvey
const props = { hasSurvey: false } as never

test('pane toggles, adds and opens on terminal and desktop', async ($, on) => {
  let md = '- [ ] milk\n- [x] eggs\n'
  on('fs.read', () => ({ value: md }))
  on('fs.write', (_$, e) => {
    md = e.text
    return { value: undefined }
  })
  let opened = ''
  on('ui.open', (_$, e) => {
    opened = e.id
    return { value: { isPlaced: true as const } }
  })
  await $.command.run({ command: 'todo', args: 'bread' } as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'todo-md', surface, component: 'Pane', props, requestId: 'todo-md' })
    await pane.press({ key: 'done0' })
    expect(md).toBe('- [x] milk\n- [x] eggs\n- [ ] bread\n')
    expect(await pane.find({ type: 'Text', text: /67%/ })).toBeDefined()
    await pane.press({ key: 'done0' })
    await pane.unmount()
  }
  // "/todo open" opens the pane instead of adding an "open" todo
  await $.command.run({ command: 'todo', args: 'open' } as never)
  expect(opened).toBe('todo-md')
  expect(md).toBe('- [ ] milk\n- [x] eggs\n- [ ] bread\n')
  // multi-line text in the pane's field adds one todo per line
  const pane = await $.ui.mount({ plugin: 'todo-md', surface: 'desktop', component: 'Pane', props, requestId: 'todo-md' })
  await pane.input({ key: 'new', text: 'x\n- [ ] y' })
  expect(md).toBe('- [ ] milk\n- [x] eggs\n- [ ] bread\n- [ ] x\n- [ ] y\n')
  // Done tab shows only done rows; Clear completed drops them
  await pane.press({ key: 'tab-done' })
  expect(await pane.find({ type: 'Text', text: 'milk' })).toBeUndefined()
  expect(await pane.find({ type: 'Text', text: 'eggs' })).toBeDefined()
  await pane.press({ key: 'clear' })
  expect(md).toBe('- [ ] milk\n- [ ] bread\n- [ ] x\n- [ ] y\n')
  // typing then the Add button adds the draft
  await pane.input({ key: 'new', text: 'z', kind: 'change' })
  await pane.press({ key: 'add' })
  expect(md).toBe('- [ ] milk\n- [ ] bread\n- [ ] x\n- [ ] y\n- [ ] z\n')
  await pane.unmount()
})
