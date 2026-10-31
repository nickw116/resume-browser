<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Bell } from "@element-plus/icons-vue";
import { api } from "../api";

interface NotificationRow {
  id: number;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

const notifications = ref<NotificationRow[]>([]);
const unread = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

async function load() {
  try {
    const d = await api<{ notifications: NotificationRow[]; unread: number }>("/api/notifications");
    notifications.value = d.notifications;
    unread.value = d.unread;
  } catch {
    // 通知加载失败不打断页面
  }
}

async function markAllRead() {
  try {
    await api("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  } catch {
    // 忽略
  }
}

onMounted(() => {
  load();
  timer = setInterval(load, 30000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <el-popover
    placement="bottom-end"
    :width="380"
    trigger="click"
    popper-class="bell-popper"
    @show="load"
  >
    <template #reference>
      <span class="bell-entry">
        <el-badge :value="unread" :hidden="!unread" :max="99">
          <el-icon :size="18"><Bell /></el-icon>
        </el-badge>
      </span>
    </template>
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">通知</span>
        <el-button v-if="unread" link type="primary" size="small" @click="markAllRead">全部已读</el-button>
      </div>
      <div class="panel-body">
        <el-empty v-if="!notifications.length" description="暂无通知" :image-size="60" />
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notice"
          :class="{ unread: !n.read }"
        >
          <span class="notice-dot" />
          <div class="notice-title">{{ n.title }}</div>
          <div v-if="n.content" class="notice-content">{{ n.content }}</div>
          <div class="notice-time">{{ fmtTime(n.createdAt) }}</div>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<style scoped>
.bell-entry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  color: var(--text-2);
  cursor: pointer;
  outline: none;
  transition:
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.bell-entry:hover {
  background: var(--surface-3);
  color: var(--text-1);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px 11px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-1);
}

.panel-body {
  max-height: 400px;
  overflow: auto;
}

.notice {
  position: relative;
  padding: 11px 16px 12px 28px;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.18s var(--ease);
}

.notice:last-child {
  border-bottom: none;
}

.notice.unread {
  background: var(--forest-050);
}

.notice-dot {
  position: absolute;
  left: 13px;
  top: 17px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--forest-600);
}

.notice:not(.unread) .notice-dot {
  display: none;
}

.notice-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-1);
  line-height: 1.5;
}

.notice-content {
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-2);
}

.notice-time {
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
</style>

<style>
/* 下拉面板：白底 + 1px 描边 + 中等阴影 */
.bell-popper.el-popper {
  --el-border-color-light: var(--border);
  padding: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}
</style>
