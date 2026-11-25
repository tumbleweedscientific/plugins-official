# Modifications from Upstream (`boltz-bio/boltz-mcpb`)

Source repository: https://github.com/boltz-bio/boltz-mcpb (MIT License, commit `8197d5a8477b548dd64ca31db5cfa9fa114ad0ec`).

1. **Replaced local desktop stdio CLI wrapper with a stateless Streamable HTTP sidecar (`packages/boltz-mcp`) behind Tumbleweed Bifrost AI Gateway**:
   - Upstream `boltz-mcpb` spawns a local `boltz-api` CLI process, stores device-code login credentials on the host filesystem, and downloads results into `~/boltz-experiments`.
   - Tumbleweed's connector runs as a stateless HTTP MCP sidecar (`boltz-mcp.service`) that injects each user's `BOLTZ_API_KEY` (`X-Boltz-Api-Key` -> `x-api-key`) per request in memory without persistence, billing, or multi-tenant leakage, and returns downloaded `.cif` / `.sdf` files as MCP `resource` parts written directly to the user's workspace (`/workspace/connectors/boltz-cloud/`).
2. **Added two-stage consent & approval gates**:
   - Saving `boltz` credentials requires accepting Boltz Bio's third-party terms (`https://boltz.bio/privacy`).
   - Calling `boltz_submit` is gated by `approvalTools` (`PromptBroker` user approval before submitting any paid cloud job), and pairs with read-only `boltz_estimate`.
3. **Authored platform-aligned `skills/boltz-cloud/SKILL.md` and added `logos/boltz.png`** (from upstream `icon.png`, MIT License).
