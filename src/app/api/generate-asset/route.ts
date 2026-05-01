import { NextResponse } from "next/server";
import { aiFetch, isAbortError } from "../../../lib/server/ai-fetch";

type GenerateAssetRequest = {
  assetType?: string;
  prompt?: string;
};

type ImageGenerationResponse = {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const { assetType, prompt } = (await request.json()) as GenerateAssetRequest;
    const normalizedAssetType = normalizeAssetType(assetType);

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "请先生成或填写素材提示词。" }, { status: 400 });
    }

    if (normalizedAssetType === "视频") {
      return NextResponse.json(
        { error: "视频生成接口已预留，请提供视频模型地址、密钥和模型名后启用。" },
        { status: 501 }
      );
    }

    const baseUrl = process.env.DIANA_OPENAI_BASE_URL;
    const apiKey = process.env.DIANA_OPENAI_API_KEY;
    const model = normalizeImageModel(process.env.DIANA_IMAGE_MODEL);

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: "缺少图片模型环境变量。" }, { status: 500 });
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/images/generations`;
    const upstream = await aiFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        prompt,
        size: "1024x1536"
      }),
      timeoutMs: 180_000
    });

    const data = await readJsonResponse<ImageGenerationResponse>(upstream);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `图片生成失败：${upstream.status}` },
        { status: upstream.status }
      );
    }

    const item = data.data?.[0];
    const assetUrl = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");

    if (!assetUrl) {
      return NextResponse.json({ error: "图片模型没有返回可预览素材。" }, { status: 502 });
    }

    return NextResponse.json({ assetUrl, assetType: "图片" });
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json({ error: "图片模型响应超时，请稍后重试。" }, { status: 504 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "素材生成失败。" },
      { status: 500 }
    );
  }
}

function normalizeAssetType(assetType?: string): "图片" | "视频" {
  const value = assetType?.toLowerCase() ?? "";
  return value.includes("视频") || value.includes("video") ? "视频" : "图片";
}

function normalizeImageModel(model?: string): string {
  const value = model?.trim() || "IMAGE2";
  return value.toUpperCase() === "IMAGE2" ? "gpt-image-2" : value;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return {
      error: {
        message: plainText ? `图片接口返回非 JSON 内容：${plainText.slice(0, 160)}` : "图片接口返回非 JSON 内容。"
      }
    } as T;
  }

  return JSON.parse(text) as T;
}
