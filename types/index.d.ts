export type Todo = { text: string; done: boolean }

declare module 'claude-code' {
  interface PluginState {
    'todo-md': { todos: Todo[]; filter: 'all' | 'open' | 'done'; draft: string }
  }
}
