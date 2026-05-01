export type AssetType = "图片" | "视频";

export type StoryboardDraft = {
  copy: string;
  script: string;
};

export type StoryboardShot = {
  id: string;
  title: string;
  duration: string;
  assetType: AssetType;
  visual: string;
  dialogue: string;
  shotSize: string;
  cameraMove: string;
  mood: string;
};

export type AssetTask = StoryboardShot & {
  taskId: string;
  status: "待生成" | "生成中" | "已完成";
  prompt: string;
  assetUrl?: string;
  assetPreviewKind?: "图片" | "视频";
  uploadedFileName?: string;
};

export const defaultCopy = `你的视频为什么开头 3 秒就被划走？

大多数创作者不是不会剪，而是从脚本到素材再到时间线的过程太割裂。我们希望用 AI 把创意拆成镜头，再把镜头自动变成可剪辑素材。

从想法到初剪，不再从空白时间线开始。`;

const defaultShots: StoryboardShot[] = [
  {
    id: "01",
    title: "冷启动钩子",
    duration: "3.5s",
    assetType: "视频",
    visual: "近景，镜头快速推向创作者的剪辑工作台，屏幕上停留在空白时间线。",
    dialogue: "你的视频为什么开头 3 秒就被划走？",
    shotSize: "近景",
    cameraMove: "快推",
    mood: "紧张、直接"
  },
  {
    id: "02",
    title: "痛点展开",
    duration: "5.0s",
    assetType: "图片",
    visual: "脚本、素材、时间线三个窗口并排出现，中间用断裂的连接线表现流程割裂。",
    dialogue: "大多数创作者不是不会剪，而是从脚本到素材再到时间线的过程太割裂。",
    shotSize: "中景",
    cameraMove: "平移",
    mood: "清晰、理性"
  },
  {
    id: "03",
    title: "方案演示",
    duration: "7.0s",
    assetType: "视频",
    visual: "用户把文案输入左侧窗口，右侧自动生成分镜头脚本，随后素材任务逐步建立。",
    dialogue: "我们希望用 AI 把创意拆成镜头，再把镜头自动变成可剪辑素材。",
    shotSize: "俯拍",
    cameraMove: "缓慢推进",
    mood: "可信、高效"
  },
  {
    id: "04",
    title: "结果对比",
    duration: "4.5s",
    assetType: "视频",
    visual: "自动生成的分镜进入素材任务栏，预览区出现完整竖屏视频画面。",
    dialogue: "从想法到初剪，不再从空白时间线开始。",
    shotSize: "特写",
    cameraMove: "切入",
    mood: "惊喜、收束"
  }
];

export function generateMockStoryboard(copy: string): string {
  const title = copy.trim().split(/\n|。|？|！/).find(Boolean) ?? "短视频创作分镜";

  return `# 分镜头脚本

项目：产品教育短片
比例：9:16
目标时长：20 秒
创作主题：${title}

## 可解析分镜任务

${defaultShots.map(formatShot).join("\n\n")}`;
}

export function parseStoryboardScript(script: string): StoryboardShot[] {
  const taskSection = script.split(/##\s*可解析分镜任务/i).pop() ?? script;
  const blocks = taskSection
    .split(/\n(?=\d{2}[｜|])/)
    .map((block) => block.trim())
    .filter((block) => /^\d{2}[｜|]/.test(block));

  return blocks.map(parseShotBlock).filter((shot): shot is StoryboardShot => Boolean(shot));
}

export function createAssetTasks(shots: StoryboardShot[]): AssetTask[] {
  return shots.map((shot) => ({
    ...shot,
    taskId: `${shot.id}-${shot.assetType}`,
    status: "待生成",
    prompt: ""
  }));
}

export function buildImagePrompt(shot: StoryboardShot): string {
  return `图片素材生成提示词

请基于以下分镜生成一张可用于短视频素材的竖屏关键帧图片。

镜头标题：${shot.title}
画面内容：${shot.visual}
台词/字幕：${shot.dialogue}
景别：${shot.shotSize}
运镜暗示：${shot.cameraMove}
情绪：${shot.mood}

画面要求：
- 竖屏 9:16，主体清晰，构图稳定，可直接作为视频首帧或封面素材。
- 画面必须具体，不要抽象概念图，不要文字海报感。
- 强化光线、材质、空间层次和情绪色彩。
- 避免多余文字、水印、畸形人物、混乱手部和不可读 UI。
- 风格应服务于当前分镜的叙事，不要过度装饰。`;
}

export function buildVideoPrompt(shot: StoryboardShot): string {
  return `视频素材生成提示词

请基于以下分镜生成一个可用于短视频剪辑的竖屏视频片段。

镜头标题：${shot.title}
画面内容：${shot.visual}
台词/字幕：${shot.dialogue}
景别：${shot.shotSize}
运镜：${shot.cameraMove}
情绪：${shot.mood}
建议时长：${shot.duration}

视频要求：
- 竖屏 9:16，镜头运动清晰，节奏适合短视频。
- 动作要有起承转合，不要只有静态画面轻微晃动。
- 保持人物、场景、光线和色调连续。
- 运镜必须自然，避免突兀变焦、画面撕裂、人物变形。
- 如果有台词，只表现口型或字幕空间，不要生成不可读文字。`;
}

function formatShot(shot: StoryboardShot): string {
  return `${shot.id}｜${shot.title}｜${shot.duration}
素材类型：${shot.assetType}
画面：${shot.visual}
台词：${shot.dialogue}
景别：${shot.shotSize}
运镜：${shot.cameraMove}
情绪：${shot.mood}`;
}

function parseShotBlock(block: string): StoryboardShot | null {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const header = lines[0]?.match(/^(\d{2})[｜|](.*?)[｜|]([0-9.]+s)$/);

  if (!header) return null;

  return {
    id: header[1],
    title: header[2],
    duration: header[3],
    assetType: normalizeAssetType(readField(lines, "素材类型")),
    visual: readField(lines, "画面"),
    dialogue: readField(lines, "台词"),
    shotSize: readField(lines, "景别"),
    cameraMove: readField(lines, "运镜"),
    mood: readField(lines, "情绪")
  };
}

function readField(lines: string[], label: string): string {
  const line = lines.find((item) => item.startsWith(`${label}：`) || item.startsWith(`${label}:`));
  return line?.replace(new RegExp(`^${label}[：:]\\s*`), "").trim() ?? "";
}

function normalizeAssetType(value: string): AssetType {
  return value.includes("图片") ? "图片" : "视频";
}

function buildAssetPrompt(shot: StoryboardShot): string {
  return shot.assetType === "图片" ? buildImagePrompt(shot) : buildVideoPrompt(shot);
}
