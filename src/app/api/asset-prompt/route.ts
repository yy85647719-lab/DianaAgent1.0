import { NextResponse } from "next/server";
import { getOpenAiConfig, getOpenAiEndpoint, hasOpenAiApiKey } from "../../../lib/server/ai-config";
import { aiFetch, isAbortError } from "../../../lib/server/ai-fetch";

type AssetPromptRequest = {
  assetType?: string;
  title?: string;
  duration?: string;
  visual?: string;
  dialogue?: string;
  shotSize?: string;
  cameraMove?: string;
  mood?: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const IMAGE_SYSTEM_PROMPT = `你是一位世界级 AI 图片生成导演，擅长把分镜头转化为高质量、可用于短视频生产的关键帧图片提示词。

目标：生成一张具有叙事张力、构图明确、主体清晰、可直接作为首帧图、角色图、场景图或封面素材的图像。

要求：
1. 画面必须具体，明确主体、动作、场景、道具、空间关系。
2. 明确构图、景别、视角、前景/中景/背景。
3. 明确光源方向、明暗关系、主色、辅助色、情绪色。
4. 竖屏 9:16，主体不能被裁切。
5. 避免复杂文字、水印、畸形人物、混乱手部和不可读 UI。

输出格式：
图片提示词：
主体：
场景：
构图：
光线与色彩：
情绪：
风格：
负面约束：`;

const VIDEO_SYSTEM_PROMPT = `你是一位世界级 AI 视频生成导演，擅长把分镜头转化为可生成、可剪辑、镜头运动清晰的短视频素材提示词。

目标：生成一个完整的视频片段提示词，让视频模型理解起始画面、主体动作、镜头运动、情绪变化和结束画面。

要求：
1. 每个视频提示词必须包含起始画面、过程动作、结束画面。
2. 明确推、拉、摇、移、跟、升降、环绕、手持或定镜。
3. 开头 1 秒要有视觉吸引点。
4. 保持人物、服装、场景、光线连续。
5. 避免人物变形、镜头撕裂、文字乱码、过度闪烁。

输出格式：
视频提示词：
起始画面：
主体动作：
镜头运动：
场景与道具：
光线与色彩：
情绪变化：
结束画面：
时长建议：
负面约束：`;

export async function POST(request: Request) {
  try {
    const task = (await request.json()) as AssetPromptRequest;
    const assetType = normalizeAssetType(task.assetType);

    if (!task.visual?.trim()) {
      return NextResponse.json({ error: "缺少分镜画面内容。" }, { status: 400 });
    }

    const openAiConfig = getOpenAiConfig();
    const model = process.env.DIANA_ASSET_PROMPT_MODEL ?? "gpt-5.5";

    if (!hasOpenAiApiKey(openAiConfig)) {
      return NextResponse.json({ error: "缺少 OPENAI_API_KEY 环境变量。" }, { status: 500 });
    }

    const endpoint = getOpenAiEndpoint("/v1/chat/completions", openAiConfig);
    const systemPrompt = assetType === "图片" ? IMAGE_SYSTEM_PROMPT : VIDEO_SYSTEM_PROMPT;
    const upstream = await aiFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiConfig.apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.65,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请为以下分镜生成${assetType}素材提示词。

镜头标题：${task.title ?? ""}
建议时长：${task.duration ?? ""}
画面：${task.visual}
台词：${task.dialogue ?? "无"}
景别：${task.shotSize ?? ""}
运镜：${task.cameraMove ?? ""}
情绪：${task.mood ?? ""}`
          }
        ]
      }),
      timeoutMs: 90_000
    });

    const data = (await upstream.json()) as ChatCompletionResponse;

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `素材提示词生成失败：${upstream.status}` },
        { status: upstream.status }
      );
    }

    const prompt = data.choices?.[0]?.message?.content?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "模型没有返回素材提示词。" }, { status: 502 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json({ error: "素材提示词模型响应超时，请稍后重试。" }, { status: 504 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "素材提示词生成失败。" },
      { status: 500 }
    );
  }
}

function normalizeAssetType(assetType?: string): "图片" | "视频" {
  const value = assetType?.toLowerCase() ?? "";
  return value.includes("图片") || value.includes("image") ? "图片" : "视频";
}
