import { ProxyAgent, fetch as undiciFetch } from "undici";

let proxyAgent: ProxyAgent | undefined;

type AiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export async function aiFetch(input: string, options: AiFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 120_000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const dispatcher = getProxyAgent();

  try {
    if (dispatcher) {
      const proxyInit = {
        ...(init as Record<string, unknown>),
        dispatcher,
        signal: controller.signal
      } as Parameters<typeof undiciFetch>[1];

      return (await undiciFetch(input, proxyInit)) as unknown as Response;
    }

    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export function getAiProxyUrl() {
  return normalizeProxyUrl(process.env.DIANA_PROXY_URL);
}

export function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function getProxyAgent() {
  const proxyUrl = getAiProxyUrl();

  if (!proxyUrl) return undefined;
  proxyAgent ??= new ProxyAgent(proxyUrl);
  return proxyAgent;
}

function normalizeProxyUrl(proxyUrl?: string) {
  const value = proxyUrl?.trim();

  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}
