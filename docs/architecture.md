# Architecture

Prime Agent Desktop keeps rendering and agent transport deliberately separate.

```text
React UI
  └─ AgentAdapter
       ├─ MockAgentAdapter       browser demo runtime
       └─ PrimeRpcAdapter        typed event/command mapping
            └─ Tauri commands + event bridge
                 └─ prime-agent --mode rpc (JSONL over stdio)
```

## Design principles

- **The UI consumes events, not subprocess text.** Terminal scraping is intentionally excluded.
- **Approvals remain explicit.** Commands and consequences are visible before a user accepts them.
- **Durable learning is auditable.** Memory, prompts, skills, and refinements are first-class views.
- **The harness remains replaceable.** ACP and other app-server adapters can be added without changing React components.
- **Local first.** Project state and credentials should remain on the user's machine.

## Runtime lifecycle

1. The user selects a project directory through the native folder picker.
2. Rust resolves the Prime Agent CLI, including common macOS GUI PATH gaps, and starts `prime-agent --mode rpc` with that project as its working directory.
3. The process bridge forwards LF-delimited stdout and stderr records as Tauri events. RPC commands are serialized as one JSON object per line on stdin.
4. `PrimeRpcAdapter` correlates responses by ID and maps session, message, tool, and extension UI events into the small React event model.
5. Closing the window or changing adapters terminates the child process. Prime Agent's own daemon remains responsible for any resident scheduled work it has promoted.

The browser-only build intentionally stays on `MockAgentAdapter`; local process access exists only in the Tauri shell.

## Provider configuration

The settings center reads Prime Agent's user-scoped `auth.json`, `models.json`, and `settings.json` through narrow Tauri commands. It never returns credential values to React.

On macOS, a saved API key is placed in Keychain under a provider-specific service name. The Prime Agent config stores a `!security find-generic-password ...` resolver instead of the key itself. Custom OpenAI-compatible providers receive a `models.json` entry; built-in providers use Prime Agent's native catalog and only need an auth reference. Serper is stored as the service credential ID Prime Agent's bundled `websearch` skill already understands.

All config files are written with user-only `0600` permissions. Existing unrelated providers, MCP servers, enabled models, and settings are preserved.
