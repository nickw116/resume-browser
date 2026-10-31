<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { ArrowDown } from "@element-plus/icons-vue";
import { api } from "../api";
import { clearAuth, getUser } from "../auth";
import { ROLE_LABEL, ROLE_TAG } from "../types";
import NotificationBell from "./NotificationBell.vue";

const route = useRoute();
const router = useRouter();
const user = getUser();

const navItems = [
  { path: "/", label: "简历浏览" },
  { path: "/schedule", label: "面试日程" },
];

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

      <nav class="nav">
        <router-link
          v-for="n in navItems"
          :key="n.path"
          :to="n.path"
          class="nav-item"
          :class="{ active: route.path === n.path }"
        >
          {{ n.label }}
        </router-link>
      </nav>
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
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-1);
}

.brand-sub {
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

/* ---------- 导航 ---------- */
.nav {
  display: flex;
  align-items: center;
  gap: 22px;
}

.nav-item {
  position: relative;
  padding: 6px 2px;
  font-size: 13.5px;
  color: var(--text-2);
  text-decoration: none;
  transition: color 0.18s var(--ease);
}

.nav-item::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 1.5px;
  background: transparent;
  transition: background-color 0.18s var(--ease);
}

.nav-item:hover {
  color: var(--text-1);
}

.nav-item.active {
  color: var(--text-1);
  font-weight: 500;
}

.nav-item.active::after {
  background: var(--forest-600);
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

  .nav {
    gap: 16px;
  }

  .header-actions {
    gap: 10px;
  }

  .user-name {
    display: none;
  }
}
</style>
