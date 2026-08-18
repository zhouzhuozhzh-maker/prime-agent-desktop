# Contributing

Thanks for helping make long-running agents easier to understand and control.

## Development

```bash
npm install
npm run dev
```

For the native shell:

```bash
npm run desktop
```

Before opening a pull request, run:

```bash
npm run check
npm run build
cd src-tauri && cargo check --locked
```

## Product rules

1. Never hide a tool call that changes files, runs a command, or reaches the network.
2. Treat memory and refinement changes as reviewable user data.
3. Keep runtime-specific protocol code behind `AgentAdapter`.
4. Preserve keyboard access and reduced-motion behavior.
5. Do not imply affiliation with Prime Intellect.
