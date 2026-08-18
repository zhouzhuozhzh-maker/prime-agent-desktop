# Architecture

Prime Agent Desktop keeps rendering and agent transport deliberately separate.

```text
React UI
  └─ AgentAdapter
       ├─ MockAgentAdapter       current interactive demo runtime
       └─ PrimeRpcAdapter        production Prime Agent RPC boundary
            └─ Prime Agent daemon / RPC mode
```

## Design principles

- **The UI consumes events, not subprocess text.** Terminal scraping is intentionally excluded.
- **Approvals remain explicit.** Commands and consequences are visible before a user accepts them.
- **Durable learning is auditable.** Memory, prompts, skills, and refinements are first-class views.
- **The harness remains replaceable.** ACP and other app-server adapters can be added without changing React components.
- **Local first.** Project state and credentials should remain on the user's machine.

## Current status

The UI is a functional MVP running on `MockAgentAdapter`. The adapter supports interactive prompts and approval state, so visual and workflow development can proceed independently of the upstream protocol integration.

`PrimeRpcAdapter` is the explicit seam for the next milestone. Before connecting it, pin an upstream Prime Agent version and map its documented JSON/RPC events to the local `AgentEvent` model.
