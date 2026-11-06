/**
 * Calls to the public APIs behind a connector: a timeout, a size cap, a
 * User-Agent naming us, one retry on 429/5xx for idempotent GETs, and the
 * Workers Cache API in front (a day by default), so repeated questions do
 * not hit the source again. Errors carry the source's status, never a body
 * the model would read as instructions.
 */
const TIMEOUT_MS = 20_000;
const MAX_BYTES = 8 * 1024 * 1024;
const USER_AGENT = "TumbleweedScientific-Connectors/0.1 (+https://tumbleweedscientific.com)";

export interface Upstream {
  json<T = unknown>(url: string | URL, init?: UpstreamInit): Promise<T>;
  text(url: string | URL, init?: UpstreamInit): Promise<string>;
}

export interface UpstreamInit {
  readonly method?: "GET" | "POST";
  readonly body?: string;
  readonly headers?: Record<string, string>;
  /** Seconds the answer may be served from cache; 0 skips the cache. */
  readonly cacheSeconds?: number;
}

export class UpstreamError extends Error {
  readonly status: number;
  constructor(host: string, status: number) {
    super(`${host} answered HTTP ${status}`);
    this.name = "UpstreamError";
    this.status = status;
  }
}

function cache(): Cache | undefined {
  return typeof caches === "undefined" ? undefined : (caches as unknown as { default?: Cache }).default;
}

export function upstream(options: { fetch?: typeof fetch } = {}): Upstream {
  const fetchImpl = options.fetch ?? fetch;
  async function get(url: string | URL, init: UpstreamInit = {}): Promise<string> {
    const target = new URL(url);
    const method = init.method ?? "GET";
    const seconds = init.cacheSeconds ?? 86_400;
    // POST bodies (search APIs) are part of the cache key.
    const key = new Request(
      method === "GET" ? target.href : `${target.href}#${await digest(init.body ?? "")}`,
    );
    const store = seconds > 0 ? cache() : undefined;
    const hit = await store?.match(key);
    if (hit !== undefined) return hit.text();
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetchImpl(target, {
        method,
        headers: { "user-agent": USER_AGENT, accept: "application/json", ...init.headers },
        ...(init.body === undefined ? {} : { body: init.body }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const retry = response.status === 429 || response.status >= 500;
      if (!retry || attempt === 1) break;
      await response.body?.cancel();
      await new Promise((done) => setTimeout(done, 500));
    }
    if (response === undefined || !response.ok) {
      await response?.body?.cancel();
      throw new UpstreamError(target.host, response?.status ?? 0);
    }
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) throw new Error(`${target.host} sent more than ${MAX_BYTES} bytes`);
    const text = await response.text();
    if (text.length > MAX_BYTES) throw new Error(`${target.host} sent more than ${MAX_BYTES} bytes`);
    await store?.put(
      key,
      new Response(text, { headers: { "cache-control": `max-age=${seconds}` } }),
    );
    return text;
  }
  return {
    text: get,
    async json(url, init) {
      const text = await get(url, init);
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`${new URL(url).host} did not answer with JSON`);
      }
    },
  };
}

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** NCBI E-utilities parameters every request carries (their usage policy). */
export function ncbiParams(env: { NCBI_API_KEY?: string; CONTACT_EMAIL?: string }): Record<string, string> {
  return {
    tool: "tumbleweed-scientific",
    ...(env.CONTACT_EMAIL ? { email: env.CONTACT_EMAIL } : {}),
    ...(env.NCBI_API_KEY ? { api_key: env.NCBI_API_KEY } : {}),
  };
}

export function withQuery(base: string, params: Record<string, string | number | undefined>): URL {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  return url;
}
