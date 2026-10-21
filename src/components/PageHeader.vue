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
  { path: "/", label: "首页" },
  { path: "/schedule", label: "Schedule" },
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
      <span class="brand">Recruit Workbench</span>
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
          {{ user?.username }}
          <el-tag v-if="user" size="small" :type="ROLE_TAG[user.role]">{{ ROLE_LABEL[user.role] }}</el-tag>
          <el-icon><ArrowDown /></el-icon>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand {
  font-size: 17px;
  font-weight: 600;
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-item {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  text-decoration: none;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.nav-item.active {
  background: #1f2937;
  color: #ffffff;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #303133;
  outline: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 768px) {
  .header {
    height: auto;
    min-height: 52px;
    padding: 6px 12px;
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .header-left {
    gap: 12px;
  }

  .brand {
    font-size: 15px;
  }

  .nav-item {
    padding: 4px 8px;
    font-size: 13px;
  }

  .header-actions {
    gap: 6px;
  }
}
</style>
