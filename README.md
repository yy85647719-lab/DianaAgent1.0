# DianaAgent1.0

AI 短视频创作工作台原型。当前版本基于 Next.js App Router，覆盖文案到分镜、分镜到素材任务、素材提示词生成、图片素材生成预览、剪辑轨道占位和提示词模板管理。

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- lucide-react
- undici

## 本地运行

```bash
npm install
npm run dev
```

当前仓库入口 `E:\VSCODE\DianaAgent1.0` 是指向 `D:\DianaAgent1.0` 的 Junction。Next.js 开发服务在 Windows 上会混用入口路径和真实路径，建议从真实路径启动：

```powershell
Set-Location D:\DianaAgent1.0
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

生产构建输出目录被配置为 `.next-runtime`，开发模式使用 Next 默认的 `.next`，相关产物均已加入 `.gitignore`。

## 环境变量

默认使用 OpenAI-compatible 接口：

```bash
OPENAI_API_KEY=replace-with-your-key
OPENAI_BASE_URL=https://www.msutools.cn
DIANA_STORYBOARD_MODEL=gpt-5.5
DIANA_ASSET_PROMPT_MODEL=gpt-5.5
DIANA_IMAGE_MODEL=IMAGE2
DIANA_PROXY_URL=
```

兼容旧变量：

- `DIANA_OPENAI_API_KEY`
- `DIANA_OPENAI_BASE_URL`

旧变量存在时优先级高于通用 `OPENAI_*` 变量。

## 目录说明

- `src/app/page.tsx`：主工作台 UI 和前端交互状态。
- `src/app/api/storyboard/route.ts`：文案生成导演级分镜，并补齐可解析任务区。
- `src/app/api/asset-prompt/route.ts`：把单个分镜转换为图片或视频素材提示词。
- `src/app/api/generate-asset/route.ts`：调用图片生成接口生成素材预览。
- `src/lib/storyboard.ts`：分镜解析、素材任务构建和本地默认模板。
- `src/lib/local-store.ts`：浏览器 localStorage 持久化。
- `src/lib/server/ai-config.ts`：服务端 AI base URL 和 API key 配置入口。
- `src/lib/server/ai-fetch.ts`：带超时和可选代理的服务端请求封装。

## 当前限制

- 视频素材生成接口仍是预留状态，图片生成已接入 `/v1/images/generations`。
- 前端状态主要保存在浏览器 localStorage，尚未接入数据库或项目文件存储。
- 暂无自动化测试，当前基础校验以 `npm run build` 为准。
