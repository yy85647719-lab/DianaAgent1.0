"use client";

import {
  Aperture,
  ChevronDown,
  Clapperboard,
  Download,
  FileVideo,
  Film,
  Image,
  Layers3,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  Sparkles,
  TextCursorInput,
  Upload,
  Wand2
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  createAssetTasks,
  parseStoryboardScript,
  type AssetTask,
  type StoryboardDraft
} from "../lib/storyboard";
import {
  loadAssetTasks,
  loadDraft,
  loadSelectedTaskId,
  saveAssetTasks,
  saveDraft,
  saveSelectedTaskId
} from "../lib/local-store";

type Stage = "storyboard" | "assets" | "editing" | "prompts";
type ToastKind = "info" | "error";

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

const defaultDraft: StoryboardDraft = {
  copy: "",
  script: ""
};

const stages: Array<{ id: Stage; label: string; icon: typeof Clapperboard }> = [
  { id: "storyboard", label: "分镜创作", icon: Clapperboard },
  { id: "assets", label: "素材生成", icon: Sparkles },
  { id: "editing", label: "智能剪辑", icon: Scissors },
  { id: "prompts", label: "提示词管理", icon: TextCursorInput }
];

export default function Home() {
  const [activeStage, setActiveStage] = useState<Stage>("storyboard");
  const [draft, setDraft] = useState<StoryboardDraft>(defaultDraft);
  const [assetTasks, setAssetTasks] = useState<AssetTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedTask = assetTasks.find((task) => task.taskId === selectedTaskId) ?? assetTasks[0];

  useEffect(() => {
    const storedDraft = loadDraft(defaultDraft);
    const storedTasks = loadAssetTasks();
    const storedSelectedTaskId = loadSelectedTaskId();

    setDraft(storedDraft);
    setAssetTasks(storedTasks);
    setSelectedTaskId(storedSelectedTaskId || storedTasks[0]?.taskId || "");
  }, []);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    saveAssetTasks(assetTasks);
  }, [assetTasks]);

  useEffect(() => {
    if (selectedTaskId) saveSelectedTaskId(selectedTaskId);
  }, [selectedTaskId]);

  async function handleGenerateStoryboard() {
    const copy = draft.copy.trim();

    if (!copy) {
      setToast({ message: "请输入创作文案后再开始创作。", kind: "error" });
      return;
    }

    setIsGenerating(true);
    setToast({ message: "正在调用 gpt-5.5 生成导演级分镜...", kind: "info" });

    try {
      const response = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy })
      });
      const data = (await response.json()) as { script?: string; error?: string };

      if (!response.ok || !data.script) {
        throw new Error(data.error ?? "分镜生成失败。");
      }

      setDraft((current) => ({ ...current, script: data.script ?? current.script }));
      setToast({ message: "gpt-5.5 已生成分镜脚本。", kind: "info" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "分镜生成失败。",
        kind: "error"
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCreateTasks() {
    if (!draft.script.trim()) {
      setToast({
        message: "请先点击“开始创作”生成分镜头脚本，再建立任务。",
        kind: "error"
      });
      return;
    }

    const shots = parseStoryboardScript(draft.script);
    const tasks = createAssetTasks(shots);

    setAssetTasks(tasks);
    setSelectedTaskId(tasks[0]?.taskId ?? "");
    setActiveStage("assets");
    setToast({
      message: tasks.length ? `已建立 ${tasks.length} 个素材任务。` : "未识别到可建立任务的分镜，请检查“可解析分镜任务”格式。",
      kind: tasks.length ? "info" : "error"
    });
  }

  return (
    <main className="h-screen overflow-hidden p-3 text-slate-950 sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-[1720px] flex-col gap-3">
        <Header activeStage={activeStage} setActiveStage={setActiveStage} />
        {toast && <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(null)} />}
        {activeStage === "storyboard" && (
          <StoryboardView
            draft={draft}
            setDraft={setDraft}
            isGenerating={isGenerating}
            onGenerateStoryboard={handleGenerateStoryboard}
            onCreateTasks={handleCreateTasks}
          />
        )}
        {activeStage === "assets" && (
          <AssetsView
            tasks={assetTasks}
            setTasks={setAssetTasks}
            selectedTask={selectedTask}
            selectedTaskId={selectedTaskId}
            setSelectedTaskId={setSelectedTaskId}
            setToast={setToast}
          />
        )}
        {activeStage === "editing" && (
          <EditingView
            tasks={assetTasks}
            setTasks={setAssetTasks}
            setToast={setToast}
          />
        )}
        {activeStage === "prompts" && <PromptManagerView />}
      </div>
    </main>
  );
}

function Header({
  activeStage,
  setActiveStage
}: {
  activeStage: Stage;
  setActiveStage: (stage: Stage) => void;
}) {
  return (
    <header className="panel flex shrink-0 flex-col gap-4 rounded-lg px-4 py-3 xl:flex-row xl:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0ABAB5] text-white">
          <Film className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold leading-6 text-[#07938F]">DianaAgent1.0</div>
          <h1 className="mt-1 truncate text-lg font-semibold leading-6 text-slate-950">AI 短视频创作工作台</h1>
        </div>
      </div>

      <nav aria-label="创作流程切换" className="min-w-0 xl:w-[820px]">
        <div className="grid gap-2 sm:grid-cols-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isActive = stage.id === activeStage;

            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`flex h-12 min-w-0 items-center justify-center gap-2 rounded-md border px-3 transition ${
                  isActive
                    ? "border-[#0ABAB5] bg-[#E6FAF8] text-[#067C78]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#0ABAB5] hover:bg-[#F2FCFB]"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-[#0ABAB5] text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-semibold">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
        <button className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0ABAB5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#07938F]">
          <Download className="h-4 w-4" />
          导出预览
        </button>
      </div>
    </header>
  );
}

function StoryboardView({
  draft,
  setDraft,
  isGenerating,
  onGenerateStoryboard,
  onCreateTasks
}: {
  draft: StoryboardDraft;
  setDraft: React.Dispatch<React.SetStateAction<StoryboardDraft>>;
  isGenerating: boolean;
  onGenerateStoryboard: () => void;
  onCreateTasks: () => void;
}) {
  return (
    <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(420px,0.82fr)_minmax(0,1.18fr)]">
      <Panel className="flex min-h-0 flex-col overflow-hidden">
        <PanelHeading title="输入创作文案" description="把口播、产品介绍或创意想法粘贴到这里" />
        <EditableText
          className="min-h-0 flex-1"
          minHeight="h-full min-h-0"
          value={draft.copy}
          placeholder="请在这里输入视频主题、口播文案、产品信息或创意方向..."
          onChange={(copy) => setDraft((current) => ({ ...current, copy }))}
        />
        <button
          onClick={onGenerateStoryboard}
          disabled={isGenerating}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0ABAB5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#07938F] disabled:cursor-not-allowed disabled:bg-[#9DE5E2]"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {isGenerating ? "正在创作..." : "开始创作"}
        </button>
      </Panel>

      <Panel className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PanelHeading title="生成分镜头脚本" description="gpt-5.5 生成结果会出现在这里，可直接编辑修改" />
          <button
            onClick={onCreateTasks}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0ABAB5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#07938F]"
          >
            <Plus className="h-4 w-4" />
            建立任务
          </button>
        </div>
        <EditableText
          className="min-h-0 flex-1"
          minHeight="h-full min-h-0"
          value={draft.script}
          placeholder="点击左侧“开始创作”后，gpt-5.5 生成的分镜头脚本会出现在这里。"
          onChange={(script) => setDraft((current) => ({ ...current, script }))}
        />
      </Panel>
    </section>
  );
}

function AssetsView({
  tasks,
  setTasks,
  selectedTask,
  selectedTaskId,
  setSelectedTaskId,
  setToast
}: {
  tasks: AssetTask[];
  setTasks: React.Dispatch<React.SetStateAction<AssetTask[]>>;
  selectedTask?: AssetTask;
  selectedTaskId: string;
  setSelectedTaskId: (taskId: string) => void;
  setToast: (toast: { message: string; kind: ToastKind }) => void;
}) {
  const [isGeneratingAssetPrompt, setIsGeneratingAssetPrompt] = useState(false);
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false);

  function handleUploadTaskAsset(taskId: string, file?: File) {
    if (!file) return;

    uploadAssetToTask({
      taskId,
      file,
      setTasks,
      setToast,
      message: `已上传到剪辑轨道：${file.name}`
    });
    setSelectedTaskId(taskId);
  }

  async function handleGeneratePrompt() {
    if (!selectedTask) {
      setToast({ message: "请先选择一个分镜头任务。", kind: "error" });
      return;
    }

    setIsGeneratingAssetPrompt(true);
    setToast({ message: `正在调用 gpt-5.5 生成${selectedTask.assetType}素材提示词...`, kind: "info" });

    try {
      const response = await fetch("/api/asset-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedTask,
          assetType: selectedTask.assetType === "图片" ? "image" : "video"
        })
      });
      const data = (await response.json()) as { prompt?: string; error?: string };

      if (!response.ok || !data.prompt) {
        throw new Error(data.error ?? "素材提示词生成失败。");
      }

      setTasks((current) =>
        current.map((task) =>
          task.taskId === selectedTask.taskId ? { ...task, prompt: data.prompt ?? task.prompt } : task
        )
      );
      setToast({ message: `gpt-5.5 已生成${selectedTask.assetType}素材提示词。`, kind: "info" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "素材提示词生成失败。",
        kind: "error"
      });
    } finally {
      setIsGeneratingAssetPrompt(false);
    }
  }

  async function handleGenerateAsset() {
    if (!selectedTask) {
      setToast({ message: "请先选择一个分镜头任务。", kind: "error" });
      return;
    }

    if (!selectedTask.prompt.trim()) {
      setToast({ message: "请先生成或填写素材提示词。", kind: "error" });
      return;
    }

    setIsGeneratingAsset(true);
    setTasks((current) =>
      current.map((task) =>
        task.taskId === selectedTask.taskId ? { ...task, status: "生成中" } : task
      )
    );
    setToast({
      message: selectedTask.assetType === "图片" ? "正在调用 IMAGE2 生成图片素材..." : "视频素材接口已预留，正在检查配置...",
      kind: "info"
    });

    try {
      const response = await fetch("/api/generate-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType: selectedTask.assetType === "图片" ? "image" : "video",
          prompt: selectedTask.prompt
        })
      });
      const data = (await response.json()) as {
        assetUrl?: string;
        assetType?: "图片" | "视频";
        error?: string;
      };

      if (!response.ok || !data.assetUrl) {
        throw new Error(data.error ?? "素材生成失败。");
      }

      setTasks((current) =>
        current.map((task) =>
          task.taskId === selectedTask.taskId
            ? {
                ...task,
                assetUrl: data.assetUrl,
                assetPreviewKind: data.assetType ?? selectedTask.assetType,
                status: "已完成"
              }
            : task
        )
      );
      setToast({ message: `${selectedTask.assetType}素材已生成，可在右侧预览。`, kind: "info" });
    } catch (error) {
      setTasks((current) =>
        current.map((task) =>
          task.taskId === selectedTask.taskId
            ? { ...task, status: task.assetUrl ? "已完成" : "待生成" }
            : task
        )
      );
      setToast({
        message: error instanceof Error ? error.message : "素材生成失败。",
        kind: "error"
      });
    } finally {
      setIsGeneratingAsset(false);
    }
  }

  return (
    <section className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
      <div className="grid h-full min-w-[1260px] grid-cols-[280px_minmax(430px,0.95fr)_minmax(560px,1.08fr)] gap-3">
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">分镜头项目</h2>
          </div>
          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {tasks.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
                暂无素材任务。请先回到分镜创作页，点击“建立任务”。
              </div>
            )}
            {tasks.map((task) => {
              const isActive = task.taskId === selectedTaskId;
              return (
                <div
                  key={task.taskId}
                  className={`flex w-full items-center gap-3 rounded-md border p-2 text-left transition ${
                    isActive ? "border-[#A9E8E5] bg-[#E6FAF8]" : "border-slate-200 bg-white hover:border-[#A9E8E5]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.taskId)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs font-bold ${isActive ? "bg-[#0ABAB5] text-white" : "bg-slate-100 text-slate-700"}`}>
                      {task.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{task.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {task.duration} · {task.assetType} · {task.status}
                        {task.uploadedFileName ? ` · ${task.uploadedFileName}` : ""}
                      </span>
                    </span>
                  </button>
                  <label
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-[#0ABAB5] hover:text-[#067C78]"
                    title="上传到剪辑镜头轨道"
                  >
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(event) => {
                        handleUploadTaskAsset(task.taskId, event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,0.84fr)_minmax(0,1.16fr)] gap-3">
          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PanelHeading title="分镜头内容" description="当前任务会自动识别为图片或视频提示词" />
              <button
                onClick={handleGeneratePrompt}
                disabled={isGeneratingAssetPrompt || !selectedTask}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0ABAB5] px-4 text-sm font-semibold text-white hover:bg-[#07938F] disabled:cursor-not-allowed disabled:bg-[#9DE5E2]"
              >
                {isGeneratingAssetPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGeneratingAssetPrompt ? "生成中..." : "生成提示词"}
              </button>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
              {selectedTask ? (
                <>
                  <p className="font-semibold text-slate-950">{selectedTask.id}｜{selectedTask.title}｜{selectedTask.duration}</p>
                  <p className="mt-2">素材类型：{selectedTask.assetType}</p>
                  <p>画面：{selectedTask.visual}</p>
                  <p>台词：{selectedTask.dialogue}</p>
                  <p>景别：{selectedTask.shotSize}</p>
                  <p>运镜：{selectedTask.cameraMove}</p>
                  <p>情绪：{selectedTask.mood}</p>
                </>
              ) : (
                <p className="text-slate-500">选择一个素材任务后，这里会显示对应分镜内容。</p>
              )}
            </div>
          </Panel>

          <Panel className="flex min-h-0 flex-col overflow-hidden border-[#A9E8E5] bg-[#F2FCFB]">
            <PanelHeading title="生成的提示词" description="点击生成提示词后输出到这里，可编辑后继续生成素材" />
            <EditableText
              className="min-h-0 flex-1 border-[#A9E8E5] bg-white"
              minHeight="h-full min-h-0"
              value={selectedTask?.prompt ?? ""}
              placeholder="点击上方“生成提示词”，这里会根据当前分镜生成图片或视频素材提示词。"
              onChange={(prompt) => {
                if (!selectedTask) return;
                setTasks((current) =>
                  current.map((task) =>
                    task.taskId === selectedTask.taskId ? { ...task, prompt } : task
                  )
                );
              }}
            />
            <button
              onClick={handleGenerateAsset}
              disabled={isGeneratingAsset || !selectedTask}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0ABAB5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#07938F] disabled:cursor-not-allowed disabled:bg-[#9DE5E2]"
            >
              {isGeneratingAsset ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isGeneratingAsset ? "素材生成中..." : `生成${selectedTask?.assetType ?? ""}素材`}
            </button>
          </Panel>
        </div>

        <aside className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_210px] gap-3">
          <Panel className="flex min-h-0 flex-col overflow-hidden border-[#A9E8E5] bg-[#F2FCFB]">
            <div className="flex items-center justify-between gap-3">
              <PanelHeading title="素材展示区" description="生成素材后输出到这里，图片和视频都可预览" />
              <Status label={selectedTask?.status ?? "待生成"} />
            </div>
            <AssetShowcase
              selectedTask={selectedTask}
              isGenerating={isGeneratingAsset}
              onUploadAsset={handleUploadTaskAsset}
            />
          </Panel>

          <Panel className="min-h-0 overflow-hidden">
            <PanelHeading title="调整建议" description="用对话方式继续修改当前素材" />
            <div className="mt-4 max-h-[92px] space-y-3 overflow-y-auto pr-1">
              <div className="rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-700">建议增强开头 1 秒的动势，让镜头推进更明显，同时减少背景细节干扰。</div>
              <div className="rounded-lg bg-[#E6FAF8] p-3 text-sm leading-6 text-[#067C78]">可以把工作台屏幕换成更清晰的分镜生成界面。</div>
            </div>
            <div className="mt-4 flex gap-2">
              <input className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#0ABAB5]" placeholder="输入调整建议..." />
              <button className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">发送</button>
            </div>
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function EditingView({
  tasks,
  setTasks,
  setToast
}: {
  tasks: AssetTask[];
  setTasks: React.Dispatch<React.SetStateAction<AssetTask[]>>;
  setToast: (toast: { message: string; kind: ToastKind }) => void;
}) {
  const libraryItems = tasks.length > 0 ? tasks : [];

  function handleUploadAsset(taskId: string, file?: File) {
    if (!file) return;

    uploadAssetToTask({
      taskId,
      file,
      setTasks,
      setToast,
      message: `已上传素材：${file.name}`
    });
  }

  async function handleDownloadAsset(asset: AssetTask) {
    if (!asset.assetUrl) {
      setToast({ message: "该素材还没有可下载文件，请先生成或上传。", kind: "error" });
      return;
    }

    const extension = getAssetExtension(asset);
    const fileName = `${asset.id}-${asset.title}.${extension}`.replace(/[\\/:*?"<>|]/g, "-");

    try {
      const blob = await fetch(asset.assetUrl).then((response) => response.blob());

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: asset.assetPreviewKind === "图片" ? "图片素材" : "视频素材",
              accept: {
                [blob.type || (asset.assetPreviewKind === "图片" ? "image/png" : "video/mp4")]: [`.${extension}`]
              }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }

      setToast({ message: `已准备下载：${fileName}`, kind: "info" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setToast({ message: error instanceof Error ? error.message : "下载失败。", kind: "error" });
    }
  }

  return (
    <section className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)]">
      <Panel className="min-h-0 overflow-y-auto">
        <PanelTitle icon={Layers3} title="素材库" action="导入" />
        <div className="mt-4 grid gap-2">
          {libraryItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
              暂无素材。请先在素材生成页建立并生成素材。
            </div>
          )}
          {libraryItems.map((asset) => {
            const isDone = asset.status === "已完成";
            return (
              <div
                key={asset.taskId}
                className={`flex items-center gap-3 rounded-md border p-2 text-left transition ${
                  isDone
                    ? "border-[#0ABAB5] bg-[#E6FAF8]"
                    : "border-slate-200 bg-white hover:border-[#A9E8E5]"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{asset.id}｜{asset.title}</span>
                  <span className={`text-xs ${isDone ? "text-[#067C78]" : "text-slate-500"}`}>
                    {asset.assetType} · {asset.status}{asset.uploadedFileName ? ` · ${asset.uploadedFileName}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleDownloadAsset(asset)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-[#0ABAB5] hover:text-[#067C78] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!asset.assetUrl}
                    title="下载素材"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-[#0ABAB5] hover:text-[#067C78]" title="从电脑上传素材">
                    <Upload className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(event) => {
                        handleUploadAsset(asset.taskId, event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_180px] gap-3">
        <Panel className="min-h-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">视频预览</h2>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <Wand2 className="h-4 w-4" />
              AI 粗剪
            </button>
          </div>
          <div className="mt-4 flex h-[calc(100%-52px)] min-h-0 items-center justify-center rounded-lg bg-slate-950 p-0">
            <div className="relative aspect-[9/16] h-full max-h-full overflow-hidden bg-gradient-to-b from-[#DDF8F6] via-white to-[#E6FAF8] shadow-2xl">
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">00:12 / 00:20</div>
              <div className="absolute inset-x-5 bottom-20 rounded-md bg-slate-950/85 px-4 py-3 text-center text-lg font-semibold leading-7 text-white">从想法到初剪，不再从空白时间线开始</div>
              <PlayButton size="large" />
            </div>
          </div>
        </Panel>
        <Panel className="min-h-0 overflow-x-auto">
          <div className="min-w-[720px]">
            <TimelineRow items={libraryItems} track="视频" />
          </div>
        </Panel>
      </div>

    </section>
  );
}

function TimelineRow({ track, items }: { track: string; items: AssetTask[] }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
      <div className="text-sm font-medium text-slate-600">{track}</div>
      <div className="flex h-12 items-center gap-2 overflow-x-auto rounded-md bg-slate-100 p-1">
        {items.length === 0 ? (
          <div className="px-3 text-xs text-slate-400">暂无镜头</div>
        ) : (
          items.map((item) => {
            const isReady = item.status === "已完成";
            return (
              <div
                key={item.taskId}
                className={`flex h-9 min-w-[150px] items-center rounded border px-3 text-xs font-semibold ${
                  isReady
                    ? "border-[#0ABAB5] bg-[#0ABAB5] text-white"
                    : "border-[#0ABAB5] bg-white text-[#067C78]"
                }`}
              >
                镜头 {item.id}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function uploadAssetToTask({
  taskId,
  file,
  setTasks,
  setToast,
  message
}: {
  taskId: string;
  file: File;
  setTasks: React.Dispatch<React.SetStateAction<AssetTask[]>>;
  setToast: (toast: { message: string; kind: ToastKind }) => void;
  message: string;
}) {
  const assetUrl = URL.createObjectURL(file);
  const isImage =
    file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name);
  const previewKind = isImage ? "图片" : "视频";

  setTasks((current) =>
    current.map((task) =>
      task.taskId === taskId
        ? {
            ...task,
            assetUrl,
            assetPreviewKind: previewKind,
            uploadedFileName: file.name,
            status: "已完成"
          }
        : task
    )
  );
  setToast({ message, kind: "info" });
}

function getAssetExtension(asset: AssetTask) {
  if (asset.uploadedFileName?.includes(".")) {
    return asset.uploadedFileName.split(".").pop() || "mp4";
  }

  return asset.assetPreviewKind === "图片" ? "png" : "mp4";
}

function PromptManagerView() {
  const promptTypes = [
    ["分镜头提示词", "把原始文案拆成镜头脚本", promptTemplate],
    ["提示词", "通用风格、平台、语气规范", generalPromptTemplate],
    ["图片素材生成提示词", "用于首帧图、角色图、场景图", imageSystemPrompt],
    ["视频素材生成提示词", "用于动态镜头和视频片段", videoSystemPrompt]
  ];
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const activePrompt = promptTypes[activePromptIndex];

  return (
    <section className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <Panel className="min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <PanelHeading title="提示词分类" description="管理不同创作阶段的模板" />
          <button className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0ABAB5] text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {promptTypes.map(([title, desc], index) => (
            <button
              key={title}
              onClick={() => setActivePromptIndex(index)}
              className={`w-full rounded-md border p-3 text-left transition ${index === activePromptIndex ? "border-[#A9E8E5] bg-[#E6FAF8]" : "border-slate-200 bg-white hover:border-[#A9E8E5]"}`}
            >
              <span className="block text-sm font-semibold text-slate-900">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid min-h-0 min-w-0 grid-rows-[170px_minmax(0,1fr)] gap-3">
        <Panel className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PanelHeading title={activePrompt[0]} description={activePrompt[1]} />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0ABAB5] px-4 text-sm font-semibold text-white hover:bg-[#07938F]">
              <Save className="h-4 w-4" />
              保存模板
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {["产品教育短片分镜", "小红书种草分镜", "口播带货分镜"].map((name, index) => (
              <button key={name} className={`rounded-lg border p-3 text-left ${index === 0 ? "border-[#A9E8E5] bg-[#E6FAF8]" : "border-slate-200 bg-white hover:border-[#A9E8E5]"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{name}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs text-[#07938F]">{index === 0 ? "默认" : "模板"}</span>
                </span>
                <span className="mt-2 block text-xs text-slate-500">{index === 0 ? "刚刚更新" : "昨天"}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <PanelHeading title="提示词内容" description="可编辑模板，后续用于分镜创作和素材生成" />
          <EditableText className="min-h-0 flex-1" minHeight="h-full min-h-0" value={activePrompt[2]} onChange={() => undefined} />
        </Panel>
      </div>

      <aside className="grid min-h-0 min-w-0 grid-rows-[minmax(0,0.55fr)_minmax(0,0.45fr)] gap-3">
        <Panel className="min-h-0 overflow-y-auto">
          <PanelHeading title="变量" description="模板中可插入的动态字段" />
          <div className="mt-4 space-y-2">
            {["{{input_copy}}", "{{target_duration}}", "{{aspect_ratio}}", "{{platform}}", "{{style}}", "{{shot_count}}"].map((item) => (
              <button key={item} className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-[#A9E8E5]">
                <span className="font-medium text-slate-800">{item}</span>
                <Plus className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="min-h-0 overflow-y-auto">
          <PanelHeading title="输出规范" description="用于保持后续页面识别稳定" />
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <div className="rounded-lg bg-slate-100 p-3">每个镜头必须保留编号和时长，便于建立素材任务。</div>
            <div className="rounded-lg bg-[#E6FAF8] p-3 text-[#067C78]">画面描述要能直接转化为图片或视频生成提示词。</div>
            <div className="rounded-lg bg-[#F2FCFB] p-3 text-[#067C78]">台词和字幕文案需要独立成行，方便后续剪辑。</div>
          </div>
        </Panel>
      </aside>
    </section>
  );
}

function Toast({ message, kind, onClose }: { message: string; kind: ToastKind; onClose: () => void }) {
  const styles = kind === "error" ? "border-[#A9E8E5] bg-white text-slate-800" : "border-[#A9E8E5] bg-[#E6FAF8] text-[#067C78]";

  return (
    <div className={`fixed right-6 top-24 z-50 flex max-w-[520px] items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${styles}`}>
      <span>{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">关闭</button>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel rounded-lg p-4 ${className}`}>{children}</section>;
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function EditableText({
  value,
  minHeight,
  placeholder,
  onChange,
  className = ""
}: {
  value: string;
  minHeight: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 ${className}`}>
      <textarea
        className={`${minHeight} w-full resize-none overflow-y-auto border-0 bg-transparent text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function PanelTitle({ icon: Icon, title, action }: { icon: typeof Clapperboard; title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#07938F] hover:bg-[#E6FAF8]">
        {action}
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}

function Status({ label }: { label: string }) {
  return <span className="rounded-full bg-[#E6FAF8] px-2 py-1 text-xs font-medium text-[#067C78]">{label}</span>;
}

function VideoPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-h-0 items-center justify-center rounded-lg bg-slate-950 p-4">
      <div className={`relative aspect-[9/16] ${compact ? "h-full max-h-[360px]" : "h-[520px] max-h-[62vh]"} overflow-hidden rounded-lg bg-gradient-to-b from-[#DDF8F6] via-white to-[#E6FAF8]`}>
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800">视频预览</span>
        <PlayButton />
      </div>
    </div>
  );
}

function AssetShowcase({
  selectedTask,
  isGenerating,
  onUploadAsset
}: {
  selectedTask?: AssetTask;
  isGenerating: boolean;
  onUploadAsset: (taskId: string, file?: File) => void;
}) {
  const previewKind = selectedTask?.assetPreviewKind ?? selectedTask?.assetType ?? "视频";
  const assetUrl = selectedTask?.assetUrl;
  const uploadButton = selectedTask ? (
    <label className="absolute right-3 top-3 z-10 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold text-[#067C78] shadow-sm hover:bg-[#E6FAF8]">
      <Upload className="h-3.5 w-3.5" />
      上传素材
      <input
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(event) => {
          onUploadAsset(selectedTask.taskId, event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </label>
  ) : null;

  if (isGenerating) {
    return (
      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-lg border border-[#A9E8E5] bg-white">
        <div className="text-center text-[#067C78]">
          <Loader2 className="mx-auto h-10 w-10 animate-spin" />
          <p className="mt-3 text-sm font-semibold">正在生成{selectedTask?.assetType ?? ""}素材</p>
        </div>
      </div>
    );
  }

  if (assetUrl && previewKind === "图片") {
    return (
      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#A9E8E5] bg-white">
        {uploadButton}
        <img src={assetUrl} alt={selectedTask?.title ?? "生成图片素材"} className="h-full w-full object-contain" />
      </div>
    );
  }

  if (assetUrl && previewKind === "视频") {
    return (
      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-[#A9E8E5] bg-slate-950">
        {uploadButton}
        <video src={assetUrl} controls className="h-full w-full object-contain" />
      </div>
    );
  }

  if (previewKind === "图片") {
    return (
      <div className="mt-4 grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className="relative flex min-h-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-[#E6FAF8]">
          {uploadButton}
          <div className="text-center text-slate-400">
            <Image className="mx-auto h-10 w-10" />
            <p className="mt-3 text-sm font-medium">图片素材预览</p>
          </div>
        </div>
        <div className="grid gap-3">
          <PreviewTile icon={Aperture} className="from-[#E6FAF8] to-white" />
          <PreviewTile icon={Image} className="from-[#F2FCFB] to-white" />
          <PreviewTile icon={FileVideo} className="from-slate-100 to-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(220px,0.78fr)_minmax(220px,1fr)]">
      <div className="relative min-h-0 overflow-hidden rounded-lg bg-slate-950">
        {uploadButton}
        <VideoPreview compact />
      </div>
      <div className="grid gap-3">
        <PreviewTile icon={Image} className="from-slate-100 to-[#E6FAF8]" />
        <PreviewTile icon={Aperture} className="from-[#E6FAF8] to-white" />
        <PreviewTile icon={FileVideo} className="from-[#F2FCFB] to-white" />
      </div>
    </div>
  );
}

function PreviewTile({ icon: Icon, className }: { icon: typeof Image; className: string }) {
  return (
    <div className={`flex min-h-[130px] items-center justify-center rounded-lg bg-gradient-to-br ${className}`}>
      <Icon className="h-8 w-8 text-slate-400" />
    </div>
  );
}

function PlayButton({ size = "normal" }: { size?: "normal" | "large" }) {
  const dimensions = size === "large" ? "h-14 w-14" : "h-12 w-12";
  const iconSize = size === "large" ? "h-6 w-6" : "h-5 w-5";

  return (
    <button className={`absolute left-1/2 top-1/2 flex ${dimensions} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg`}>
      <Play className={`ml-1 ${iconSize} fill-current`} />
    </button>
  );
}

const promptTemplate = `你是一位短视频分镜导演，请根据用户输入的文案生成结构化分镜头脚本。

输出要求：
1. 保持中文输出。
2. 按镜头编号拆分，每个镜头必须包含：镜头标题、时长、素材类型、画面、台词、景别、运镜、情绪。
3. 素材类型只能写“图片”或“视频”。
4. 总时长控制在 {{target_duration}} 内。
5. 视频比例为 {{aspect_ratio}}。
6. 分镜要适合 {{platform}} 的短视频节奏。
7. 开头 3 秒必须有明确钩子。
8. 不要输出解释，只输出可直接用于素材生成的分镜脚本。

用户文案：
{{input_copy}}`;

const generalPromptTemplate = `你是 DianaAgent 的短视频创作提示词管理器。

你的任务是把用户的主题、文案、平台、时长、风格要求转化为稳定、清晰、可复用的创作提示词。

通用原则：
1. 输出必须具体，可执行，避免空泛形容词。
2. 每条提示词都要服务于短视频生产链路：分镜、图片素材、视频素材、剪辑。
3. 保持中文输出。
4. 优先考虑竖屏 9:16、强钩子、短节奏、高信息密度。
5. 如用户没有给出平台，默认适配抖音 / 小红书 / 视频号。`;

const imageSystemPrompt = `你是一位世界级 AI 图片生成导演，擅长把分镜头转化为高质量、可用于短视频生产的关键帧图片提示词。

你的目标不是简单复述分镜，而是生成一张具有叙事张力、构图明确、主体清晰、可直接作为首帧图、角色图、场景图或封面素材的图像。

你必须遵循：
1. 画面具体
- 明确主体、动作、场景、道具、空间关系。
- 不写“震撼”“高级”“有氛围”这类空泛词，必须转化为可见元素。

2. 构图专业
- 明确景别、视角、主体位置、前景/中景/背景关系。
- 适合竖屏 9:16，主体不能被裁切。

3. 光线与色彩
- 明确光源方向、明暗关系、主色、辅助色、情绪色。
- 色彩必须服务于分镜情绪。

4. 可生成性
- 避免复杂文字、水印、过多人物、混乱 UI、畸形手部。
- 如果涉及屏幕或界面，只描述整体视觉，不要求生成可读小字。

输出格式：
图片提示词：
主体：
场景：
构图：
光线与色彩：
情绪：
风格：
负面约束：`;

const videoSystemPrompt = `你是一位世界级 AI 视频生成导演，擅长把分镜头转化为可生成、可剪辑、镜头运动清晰的短视频素材提示词。

你的目标是生成一个完整的视频片段提示词，让视频模型理解：画面从哪里开始，人物或物体如何运动，镜头如何运动，情绪如何变化，最后停在哪里。

你必须遵循：
1. 动作连续
- 每个视频提示词必须包含起始画面、过程动作、结束画面。
- 避免只描述静态画面。

2. 运镜明确
- 明确推、拉、摇、移、跟、升降、环绕、手持或定镜。
- 运镜必须自然，不要突兀变焦或无意义晃动。

3. 节奏适配短视频
- 开头 1 秒要有视觉吸引点。
- 动作和画面变化要明显，但不能混乱。

4. 生成稳定
- 保持人物、服装、场景、光线连续。
- 避免人物变形、镜头撕裂、文字乱码、过度闪烁。

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

