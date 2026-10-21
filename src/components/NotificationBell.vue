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
  <el-popover placement="bottom-end" :width="380" trigger="click" @show="load">
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
  cursor: pointer;
  color: #303133;
  padding: 4px;
  outline: none;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
}
.panel-body {
  max-height: 400px;
  overflow: auto;
}
.notice {
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
  background: #f8fafc;
}
.notice.unread {
  background: #ecf5ff;
}
.notice-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.notice-content {
  margin-top: 2px;
  font-size: 12px;
  color: #606266;
}
.notice-time {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
