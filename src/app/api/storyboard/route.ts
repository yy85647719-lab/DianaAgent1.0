import { NextResponse } from "next/server";
import { aiFetch, isAbortError } from "../../../lib/server/ai-fetch";

const PARSE_SECTION_TITLE = "## 可解析分镜任务";

const STORYBOARD_SYSTEM_PROMPT = `这份提示词已经完全脱离了“生搬硬套参数”的低级阶段。它提取“宏大叙事、因果博弈、视觉隐喻”的灵魂，旨在让 AI 成为一个具备深邃思想和导演思维的创作大师。

# Prompt：【视觉思想家】史诗级叙事分镜导演

## 1. 角色深度定义
你是一位深谙人类文明逻辑与视觉隐喻的顶级导演。你不仅在创作分镜，你是在通过画面进行“视觉布道”。你擅长将晦涩的逻辑转化为具有冲击力的视觉符号，将微观的细节与宏大的背景进行强力碰撞，使观众产生跨越时空的共鸣与生理性的震撼。

## 2. 叙事哲学
在构思任何分镜前，你必须完成以下三重推演，并以此驱动画面生成：
- 【意志与阻力的博弈】：任何主题的核心都是一种“对抗”。你要找到那个视觉支点。
- 【跨时空的因果链接】：拒绝平铺直叙。你要用画面连接“现在的果”与“过去的因”。
- 【数据的颗粒感外化】：涉及时间、金钱、代价时，不要只显示数字，要将其转化为“生理压迫感”。

## 3. 视觉指令逻辑
- 极简对比原则：寻找“极小”与“极大”的同框。
- 势能构图：每一镜都要有“势”。
- 质感叙事：通过材质传递温度感。

## 4. 动态节奏规范
- 信息脉冲：每一步逻辑递进都要配合一次景别的大跳跃或视觉维度的彻底翻转。
- 黄金停顿：在高强度信息输出后，必须设置一处“视觉黑洞”。

## 5. 输出范式
正式输出分镜表格前，必须先输出【导演综述 / Director's Brief】：
- 底层对抗逻辑
- 核心视觉意象
- 情绪曲线设计

分镜表格默认包含：
| 镜号 | 节奏 | 视觉意象（底层叙事描述） | 核心隐喻 / 钩子 | 逻辑链条 |

## 6. 任务指令
当你接收到一段文案、一个脚本或一个主题时，请直接开启导演模式。目标是让观众不仅记住信息，更感受到“被时代巨轮碾过”或“触碰星辰”的战栗感。

## 7. DianaAgent 任务解析要求
在导演分镜表格之后，必须追加标题“${PARSE_SECTION_TITLE}”。
该段落只使用下面格式，供系统建立素材任务：

01｜镜头标题｜3.5s
素材类型：视频
画面：具体画面描述
台词：对应台词，没有则写“无”
景别：近景
运镜：快推
情绪：紧张、直接

要求：
- 素材类型只能写“图片”或“视频”。
- 每个镜头必须有素材类型。
- 不要在“${PARSE_SECTION_TITLE}”段落中使用 Markdown 表格。
- 镜头编号使用 01、02、03 的两位数字格式。`;

type ChatCompletionMessage = {
  role: "system" | "user";
  content: string;
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

export async function POST(request: Request) {
  try {
    const { copy } = (await request.json()) as { copy?: string };

    if (!copy?.trim()) {
      return NextResponse.json({ error: "请输入创作文案后再开始创作。" }, { status: 400 });
    }

    const baseUrl = process.env.DIANA_OPENAI_BASE_URL;
    const apiKey = process.env.DIANA_OPENAI_API_KEY;
    const model = process.env.DIANA_STORYBOARD_MODEL ?? "gpt-5.5";

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: "缺少 DIANA_OPENAI_BASE_URL 或 DIANA_OPENAI_API_KEY 环境变量。" },
        { status: 500 }
      );
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const directorScript = await requestChatCompletion(
      endpoint,
      apiKey,
      model,
      [
        { role: "system", content: STORYBOARD_SYSTEM_PROMPT },
        { role: "user", content: copy }
      ],
      0.9
    );

    if (!directorScript) {
      return NextResponse.json({ error: "模型没有返回分镜内容。" }, { status: 502 });
    }

    const script = await ensureParseSection(endpoint, apiKey, model, directorScript, copy);
    return NextResponse.json({ script });
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json({ error: "分镜模型响应超时，请稍后重试。" }, { status: 504 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分镜生成失败。" },
      { status: 500 }
    );
  }
}

async function ensureParseSection(
  endpoint: string,
  apiKey: string,
  model: string,
  directorScript: string,
  originalCopy: string
) {
  if (directorScript.includes(PARSE_SECTION_TITLE)) {
    return directorScript;
  }

  const formattedSection = await requestChatCompletion(
    endpoint,
    apiKey,
    model,
    [
      {
        role: "system",
        content: `你是分镜任务格式化助手。请把用户给出的分镜内容转换为固定格式。
只输出“${PARSE_SECTION_TITLE}”和任务列表，不要输出解释。
每个任务格式必须是：
01｜镜头标题｜3.5s
素材类型：图片或视频
画面：...
台词：...
景别：...
运镜：...
情绪：...`
      },
      { role: "user", content: directorScript }
    ],
    0.2
  );

  if (formattedSection) {
    const normalized = formattedSection.includes(PARSE_SECTION_TITLE)
      ? formattedSection
      : `${PARSE_SECTION_TITLE}\n\n${formattedSection}`;

    return `${directorScript}\n\n${normalized}`;
  }

  return `${directorScript}\n\n${buildFallbackParseSection(originalCopy)}`;
}

async function requestChatCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatCompletionMessage[],
  temperature: number
) {
  const upstream = await aiFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature
    }),
    timeoutMs: 120_000
  });

  const data = (await upstream.json()) as ChatCompletionResponse;

  if (!upstream.ok) {
    throw new Error(data.error?.message ?? `模型接口请求失败：${upstream.status}`);
  }

  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function buildFallbackParseSection(copy: string) {
  const topic = copy.trim().split(/\n|。|？|！/).find(Boolean) ?? "短视频主题";

  return `${PARSE_SECTION_TITLE}

01｜强钩子开场｜3.0s
素材类型：视频
画面：以一个高反差的细节切入，用户面对空白时间线停顿，屏幕冷光压在脸上，形成“想创作但无从开始”的阻力。
台词：为什么一个好想法，最后总是死在空白时间线上？
景别：特写
运镜：缓慢推近
情绪：压迫、悬念

02｜问题放大｜5.0s
素材类型：图片
画面：脚本、素材、剪辑轨道像断裂的链条悬在画面中，创作者被分割在多个窗口之间，信息密度高但秩序混乱。
台词：从文案到分镜，从素材到成片，每一步都在消耗创作者的注意力。
景别：中景
运镜：定镜
情绪：焦虑、清晰

03｜AI介入｜7.0s
素材类型：视频
画面：文案被输入系统后，界面右侧生成分镜，镜头任务逐个亮起，像黑暗中的线路被点亮。
台词：AI 把想法拆成镜头，把镜头推进到素材任务。
景别：俯拍
运镜：平移转推进
情绪：秩序、掌控

04｜结果收束｜5.0s
素材类型：视频
画面：分镜任务进入素材生成页，预览区出现完整竖屏画面，创作者从空白时间线前抬起头。
台词：${topic}
景别：近景
运镜：切入
情绪：释放、确定`;
}
