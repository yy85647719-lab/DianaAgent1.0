const DEFAULT_OPENAI_BASE_URL = "https://www.msutools.cn";

export type OpenAiConfig = {
  baseUrl: string;
  apiKey: string;
};

export function getOpenAiConfig(): OpenAiConfig {
  return {
    baseUrl: normalizeBaseUrl(
      process.env.DIANA_OPENAI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        DEFAULT_OPENAI_BASE_URL
    ),
    apiKey: process.env.DIANA_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ""
  };
}

export function getOpenAiEndpoint(path: string, config = getOpenAiConfig()) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${config.baseUrl}${normalizedPath}`;
}

export function hasOpenAiApiKey(config = getOpenAiConfig()) {
  return Boolean(config.apiKey.trim());
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, "");
}
