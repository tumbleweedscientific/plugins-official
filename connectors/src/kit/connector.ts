/**
 * The common shape of the connectors Tumbleweed hosts (ADR 0041): one Worker
 * per group of public APIs, one MCP endpoint (`POST /mcp`, Streamable HTTP,
 * stateless), tools named and shaped alike (search, get, batch), every
 * result carrying its source's attribution and terms, upstream responses
 * cached, and a per-caller rate limit. No credentials for open sources.
 */
import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import type { z } from "zod";
import { type Upstream, upstream } from "./upstream.ts";

export interface Source {
  /** Shown to the model and the user with every result. */
  readonly name: string;
  readonly attribution: string;
  readonly terms: string;
}

export interface Env {
  /** Workers Rate Limiting binding, keyed per caller (absent in tests: no limit). */
  readonly RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  /** Optional upstream keys (Worker secrets), e.g. NCBI_API_KEY. */
  readonly NCBI_API_KEY?: string;
  /** Contact for polite pools (NCBI `email`, OpenAlex `mailto`); a plain var. */
  readonly CONTACT_EMAIL?: string;
}

export interface ToolContext {
  readonly env: Env;
  readonly http: Upstream;
}

export interface ToolSpec<S extends z.ZodObject> {
  readonly name: string;
  readonly description: string;
  readonly input: S;
  /** Sources whose data the tool returns; their attribution goes with the result. */
  readonly sources: readonly Source[];
  run(args: z.infer<S>, ctx: ToolContext): Promise<unknown>;
}

/** A tool spec with its schema type kept (helps inference at the call site). */
export function tool<S extends z.ZodObject>(spec: ToolSpec<S>): ToolSpec<S> {
  return spec;
}

/** Results are JSON text, at most this long; longer ones are cut with a note. */
export const RESULT_MAX_CHARS = 60_000;

export function render(data: unknown, sources: readonly Source[]): string {
  const credit = sources.map((s) => `${s.name}: ${s.attribution} Terms: ${s.terms}`).join("\n");
  let body = JSON.stringify(data, null, 1);
  if (body.length > RESULT_MAX_CHARS) {
    body = `${body.slice(0, RESULT_MAX_CHARS)}\n… (truncated; narrow the query or ask for fewer items)`;
  }
  return `${body}\n\nSource: ${credit}`;
}

export interface ConnectorSpec {
  readonly name: string;
  readonly version: string;
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool schemas
  readonly tools: readonly ToolSpec<any>[];
}

/** The caller a rate limit applies to: the platform's user hash, or the client address. */
function callerKey(request: Request): string {
  return (
    request.headers.get("x-tumbleweed-user") ??
    request.headers.get("cf-connecting-ip") ??
    "anonymous"
  );
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** The Worker's fetch handler for a connector. */
export function connector(spec: ConnectorSpec, options: { fetch?: typeof fetch } = {}) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
      // Routed as /<name>/… on the shared connectors host, or at the root of its own.
      const path = url.pathname.startsWith(`/${spec.name}/`)
        ? url.pathname.slice(spec.name.length + 1)
        : url.pathname;
      if (path === "/" || path === "/healthz") {
        return json(200, { name: spec.name, version: spec.version, tools: spec.tools.map((t) => t.name) });
      }
      if (path !== "/mcp") return json(404, { error: "not found" });
      if (env.RATE_LIMITER !== undefined) {
        const { success } = await env.RATE_LIMITER.limit({ key: callerKey(request) });
        if (!success) return json(429, { error: "rate limited; retry in a minute" }, { "retry-after": "60" });
      }
      const http = upstream({ ...(options.fetch === undefined ? {} : { fetch: options.fetch }) });
      const server = new McpServer({ name: `tumbleweed-${spec.name}`, version: spec.version });
      for (const t of spec.tools) {
        server.registerTool(
          t.name,
          { description: t.description, inputSchema: t.input },
          async (args: unknown) => {
            try {
              const data = await t.run(args, { env, http });
              return { content: [{ type: "text" as const, text: render(data, t.sources) }] };
            } catch (error) {
              return {
                isError: true,
                content: [{ type: "text" as const, text: `${t.name} failed: ${(error as Error).message}` }],
              };
            }
          },
        );
      }
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      return transport.handleRequest(request);
    },
  };
}
