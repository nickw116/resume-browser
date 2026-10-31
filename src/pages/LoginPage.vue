<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api } from "../api";
import { setAuth } from "../auth";
import type { UserInfo } from "../types";

const router = useRouter();
const route = useRoute();

const form = reactive({ username: "", password: "" });
const loading = ref(false);

async function submit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning("请输入用户名和密码");
    return;
  }
  loading.value = true;
  try {
    const d = await api<{ token: string; user: UserInfo }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username.trim(), password: form.password }),
    });
    setAuth(d.token, d.user);
    ElMessage.success(`欢迎，${d.user.username}`);
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.push(redirect);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "登录失败");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <!-- 品牌侧 -->
    <aside class="panel">
      <div class="panel-inner">
        <div class="brand">
          <span class="brand-mark" />
          <span class="brand-text">Recruit Workbench</span>
        </div>
        <div class="panel-copy">
          <h1 class="panel-title">电子简历<br />浏览与流程</h1>
          <p class="panel-desc">
            候选人简历、约面确认、面试结果与入职登记，在同一条链路上完成。
          </p>
        </div>
        <ul class="panel-list">
          <li>按品牌 / 城市 / 店铺浏览人员档案</li>
          <li>约面 · 面试评价 · 入职确认</li>
          <li>面试日程日历与需求协同</li>
        </ul>
        <div class="panel-foot">FaHrService · Fa Retail Cloud</div>
      </div>
    </aside>

    <!-- 表单侧 -->
    <main class="form-side">
      <div class="form-wrap">
        <div class="form-head">
          <span class="eyebrow">电子简历系统</span>
          <h2 class="form-title">登录</h2>
          <p class="form-desc">请使用企业账号登录</p>
        </div>

        <el-form :model="form" label-position="top" @submit.prevent="submit">
          <el-form-item label="用户名">
            <el-input
              v-model="form.username"
              autocomplete="username"
              placeholder="请输入用户名"
              size="large"
            />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              size="large"
              show-password
              @keyup.enter="submit"
            />
          </el-form-item>
          <el-button class="submit" type="primary" size="large" :loading="loading" @click="submit">
            登 录
          </el-button>
        </el-form>

        <div class="form-note">账号由管理员分配；如需开通权限，请联系 FaHr 团队。</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(360px, 44%) 1fr;
  background: var(--surface);
}

/* ---------- 品牌侧 ---------- */
.panel {
  position: relative;
  background: var(--ink-900);
  overflow: hidden;
  display: flex;
}

.panel::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
  background-size: 44px 44px;
  pointer-events: none;
}

.panel::before {
  content: "";
  position: absolute;
  right: -120px;
  top: 18%;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(31, 70, 54, 0.55), transparent 68%);
  pointer-events: none;
}

.panel-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 34px;
  padding: 52px 54px;
  width: 100%;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--forest-600);
  box-shadow: 0 0 0 1px rgba(143, 180, 163, 0.3) inset;
}

.brand-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.86);
}

.panel-copy {
  margin-top: auto;
}

.panel-title {
  font-size: 34px;
  line-height: 1.24;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #f4f7f5;
}

.panel-desc {
  margin: 16px 0 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.5);
  max-width: 30ch;
}

.panel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.panel-list li {
  position: relative;
  padding-left: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
}

.panel-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--forest-400);
}

.panel-foot {
  margin-top: auto;
  padding-top: 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.26);
}

/* ---------- 表单侧 ---------- */
.form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--surface);
}

.form-wrap {
  width: 100%;
  max-width: 368px;
}

.form-head {
  margin-bottom: 32px;
}

.form-head .eyebrow {
  display: block;
  margin-bottom: 12px;
  color: var(--forest-600);
}

.form-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.form-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.submit {
  width: 100%;
  height: 44px;
  font-size: 14px;
  letter-spacing: 0.18em;
  margin-top: 6px;
}

.form-note {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-3);
}

@media (max-width: 900px) {
  .login {
    grid-template-columns: 1fr;
  }

  .panel {
    display: none;
  }

  .form-side {
    padding: 32px 22px;
  }
}
</style>
