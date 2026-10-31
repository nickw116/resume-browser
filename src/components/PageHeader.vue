<script setup lang="ts">
import { useRouter } from "vue-router";
import { ArrowDown } from "@element-plus/icons-vue";
import { api } from "../api";
import { clearAuth, getUser } from "../auth";
import { ROLE_LABEL, ROLE_TAG } from "../types";
import NotificationBell from "./NotificationBell.vue";

const router = useRouter();
const user = getUser();

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // 忽略登出接口错误，本地照常清理
  }
  clearAuth();
  router.push("/login");
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <router-link to="/" class="brand">
        <span class="brand-mark" />
        <span class="brand-text">
          <span class="brand-name">Recruit Workbench</span>
          <span class="brand-sub">电子简历系统</span>
        </span>
      </router-link>

    </div>

    <div class="header-actions">
      <slot />
      <NotificationBell />
      <el-dropdown trigger="click" @command="logout">
        <span class="user-entry">
          <span class="user-avatar">{{ (user?.username ?? "?").slice(0, 1).toUpperCase() }}</span>
          <span class="user-name">{{ user?.username }}</span>
          <el-tag v-if="user" size="small" :type="ROLE_TAG[user.role]">{{ ROLE_LABEL[user.role] }}</el-tag>
          <el-icon class="user-caret"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 64px;
  padding: 0 28px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 30px;
  min-width: 0;
}

/* ---------- 品牌 ---------- */
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--forest-600);
  box-shadow: 0 0 0 1px rgba(143, 180, 163, 0.3) inset;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-name {
  font-family: var(--font-display);
  font-size: 15px;
  letter-spacing: 0.01em;
  color: var(--text-1);
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-3);
}

/* ---------- 右侧 ---------- */
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  outline: none;
  padding: 4px 10px 4px 4px;
  border-radius: var(--radius-pill);
  transition: background-color 0.18s var(--ease);
}

.user-entry:hover {
  background: var(--surface-3);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ink-800);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name {
  font-size: 13px;
  color: var(--text-1);
  font-weight: 500;
}

.user-caret {
  color: var(--text-3);
  font-size: 12px;
}

@media (max-width: 820px) {
  .header {
    height: auto;
    min-height: 58px;
    padding: 8px 14px;
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .header-left {
    gap: 16px;
  }

  .brand-sub {
    display: none;
  }

  .header-actions {
    gap: 10px;
  }

  .user-name {
    display: none;
  }
}
</style>
