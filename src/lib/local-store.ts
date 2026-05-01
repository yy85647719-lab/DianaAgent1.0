import type { AssetTask, StoryboardDraft } from "./storyboard";

const DRAFT_KEY = "diana.storyboard.draft.v2";
const TASKS_KEY = "diana.asset.tasks";
const SELECTED_TASK_KEY = "diana.asset.selectedTaskId";

export function loadDraft(fallback: StoryboardDraft): StoryboardDraft {
  return loadJson(DRAFT_KEY, fallback);
}

export function saveDraft(draft: StoryboardDraft) {
  saveJson(DRAFT_KEY, draft);
}

export function loadAssetTasks(): AssetTask[] {
  return loadJson(TASKS_KEY, []);
}

export function saveAssetTasks(tasks: AssetTask[]) {
  saveJson(TASKS_KEY, tasks);
}

export function loadSelectedTaskId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELECTED_TASK_KEY) ?? "";
}

export function saveSelectedTaskId(taskId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_TASK_KEY, taskId);
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
