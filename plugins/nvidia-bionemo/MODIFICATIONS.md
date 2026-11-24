# Modifications

- Replaced local OpenScience CLI (`scientific_capability`) and Modal GPU job abstractions with the hosted Tumbleweed MCP connector (`nvidia-bionemo` via `https://ai-gateway.tumbleweedscientific.com/mcp/bionemo`).
- Enforced Tumbleweed naming (`bionemo-` prefix on bundled skills: `bionemo-nims`, `bionemo-protein-binder-design`).
- Added mandatory `requires.connectors: ["nvidia-bionemo"]` so enabling any BioNeMo skill attaches the hosted connector and prompts for the user's `nvidia-nim` (`NVIDIA_API_KEY`) key with explicit third-party privacy/billing terms.
- Replaced blocking single-shot calls with a non-blocking 4-tool surface (`bionemo-bionemo_describe`, `bionemo-bionemo_plan`, `bionemo-bionemo_submit`, `bionemo-bionemo_poll`) plus per-task `PromptBroker` approval on `bionemo_submit`.
- Bounded unconfirmed generative design funnels in `bionemo-protein-binder-design` to at most 4 candidates per approved batch and removed hardcoded benchmark targets or Modal container commands.
