<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import { api, withBase } from "../api";
import { clearAuth, getUser } from "../auth";
import { STATUS_LABEL, STATUS_TAG } from "../status";
import { ROLE_LABEL, ROLE_TAG, type BrandNode, type CandidateRow } from "../types";
import ResumeDialog from "../components/ResumeDialog.vue";

interface TreeNode {
  key: string;
  label: string;
  level: "brand" | "city" | "store";
  id: number;
  count?: number;
  children?: TreeNode[];
}

const router = useRouter();
const user = getUser();

const brands = ref<BrandNode[]>([]);
const candidates = ref<CandidateRow[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const selected = ref<{ level: "brand" | "city" | "store"; id: number; label: string } | null>(null);

const detailVisible = ref(false);
const detailCandidate = ref<CandidateRow | null>(null);
const photoPreviewUrl = ref("");

const treeData = computed<TreeNode[]>(() =>
  brands.value.map((b) => ({
    key: `brand-${b.id}`,
    label: b.name,
    level: "brand",
    id: b.id,
    children: b.cities.map((c) => ({
      key: `city-${c.id}`,
      label: c.name,
      level: "city",
      id: c.id,
      children: c.stores.map((s) => ({
        key: `store-${s.id}`,
        label: s.name,
        level: "store",
        id: s.id,
        count: s._count?.candidates,
      })),
    })),
  })),
);

const treeProps = { label: "label", children: "children" };

async function loadOrg() {
  try {
    const d = await api<{ brands: BrandNode[] }>("/api/org?published=1");
    brands.value = d.brands;
  } catch {
    ElMessage.error("组织架构加载失败");
  }
}

async function load() {
  const sel = selected.value;
  if (!sel) {
    candidates.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("published", "1");
    if (sel.level === "brand") params.set("brandId", String(sel.id));
    else if (sel.level === "city") params.set("cityId", String(sel.id));
    else params.set("storeId", String(sel.id));
    params.set("page", String(page.value));
    params.set("pageSize", String(pageSize.value));
    const d = await api<{ candidates: CandidateRow[]; total: number }>(
      `/api/candidates?${params.toString()}`,
    );
    candidates.value = d.candidates;
    total.value = d.total;
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "加载失败");
  } finally {
    loading.value = false;
  }
}

function onNodeClick(node: TreeNode) {
  selected.value = { level: node.level, id: node.id, label: node.label };
  page.value = 1;
  load();
}

function openDetail(row: CandidateRow) {
  detailCandidate.value = row;
  detailVisible.value = true;
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // 忽略登出接口错误，本地照常清理
  }
  clearAuth();
  router.push("/login");
}

onMounted(loadOrg);
</script>

<template>
  <div class="page">
    <header class="header">
      <span class="brand">电子简历系统</span>
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
    </header>

    <div class="browser">
      <el-card class="tree-card" shadow="never">
        <p class="card-title">店铺清单</p>
        <el-tree
          :data="treeData"
          :props="treeProps"
          node-key="key"
          highlight-current
          default-expand-all
          @node-click="onNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node" :class="`lv-${data.level}`">
              <span>{{ data.label }}</span>
              <span v-if="data.level === 'store' && data.count !== undefined" class="tree-count">
                {{ data.count }}
              </span>
            </span>
          </template>
        </el-tree>
      </el-card>

      <el-card class="list-card" shadow="never">
        <div class="list-head">
          <span class="card-title">
            {{ selected ? `${selected.label} · 共 ${total} 人` : "请选择左侧店铺" }}
          </span>
        </div>

        <div v-if="!selected" class="placeholder">点击左侧品牌 / 城市 / 店铺查看人员简历</div>
        <div v-else v-loading="loading" class="list-body">
          <el-empty v-if="!candidates.length && !loading" description="该节点下暂无人员" :image-size="80" />
          <div class="grid">
            <div v-for="c in candidates" :key="c.id" class="person">
              <el-avatar
                :size="44"
                :src="c.photo ? withBase(c.photo) : undefined"
                :class="{ 'avatar-clickable': c.photo }"
                @click.stop="c.photo && (photoPreviewUrl = withBase(c.photo))"
              >
                {{ c.name.slice(0, 1) }}
              </el-avatar>
              <div class="person-info">
                <p class="person-name">{{ c.name }}</p>
                <p class="person-meta">
                  {{ c.gender === "MALE" ? "男" : "女" }}
                  <template v-if="c.age !== null"> · {{ c.age }} 岁</template>
                </p>
                <el-tag :type="STATUS_TAG[c.status] ?? 'info'" size="small">
                  {{ STATUS_LABEL[c.status] ?? c.status }}
                </el-tag>
              </div>
              <el-button type="primary" plain size="small" class="detail-btn" @click="openDetail(c)">
                详情
              </el-button>
            </div>
          </div>
          <div v-if="total > pageSize" class="pager">
            <el-pagination
              v-model:current-page="page"
              background
              layout="total, prev, pager, next"
              :total="total"
              :page-size="pageSize"
              @current-change="load"
            />
          </div>
        </div>
      </el-card>
    </div>

    <ResumeDialog v-model="detailVisible" :candidate="detailCandidate" @changed="load" />
    <el-image-viewer
      v-if="photoPreviewUrl"
      :url-list="[photoPreviewUrl]"
      teleported
      @close="photoPreviewUrl = ''"
    />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.brand {
  font-size: 17px;
  font-weight: 600;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #303133;
  outline: none;
}

.browser {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
}

.tree-card {
  width: 280px;
  flex-shrink: 0;
}

.tree-card :deep(.el-tree-node__content) {
  height: 38px;
  border-radius: 6px;
}

.tree-card :deep(.el-tree-node__content:hover) {
  background-color: #f0f7ff;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.lv-brand {
  font-size: 16px;
  font-weight: 600;
}

.lv-city {
  font-size: 15px;
}

.lv-store {
  font-size: 14px;
  color: #303133;
}

.tree-count {
  background: #ecf5ff;
  color: #409eff;
  border-radius: 10px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
}

.card-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.avatar-clickable {
  cursor: zoom-in;
}

.list-card {
  flex: 1;
  min-width: 0;
  min-height: 400px;
}

.list-head {
  margin-bottom: 12px;
}

.placeholder {
  padding: 80px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px 14px;
}

.person-info {
  flex: 1;
  min-width: 0;
}

.person-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.person-meta {
  margin: 2px 0 6px;
  color: #909399;
  font-size: 12px;
}

.detail-btn {
  flex-shrink: 0;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
