<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { Filter } from "@element-plus/icons-vue";
import { api, withBase } from "../api";
import { getUser } from "../auth";
import { STATUS_LABEL, STATUS_TAG } from "../status";
import { type BrandNode, type CandidateRow } from "../types";
import { columnWidth } from "../autoWidth";
import ResumeDialog from "../components/ResumeDialog.vue";
import RequirementFormDialog from "../components/RequirementFormDialog.vue";
import RequirementListDrawer from "../components/RequirementListDrawer.vue";
import PageHeader from "../components/PageHeader.vue";
import PageNav from "../components/PageNav.vue";

interface TreeNode {
  key: string;
  label: string;
  level: "store";
  id: number;
  count?: number;
  /** 品牌 · 城市，作为店铺的次级信息 */
  meta?: string;
  /** 所属品牌名，用于页面标题 */
  brandName?: string;
}

const user = getUser();

const brands = ref<BrandNode[]>([]);
const candidates = ref<CandidateRow[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const selected = ref<{ level: "store"; id: number; label: string; brandName?: string } | null>(null);

// 筛选标签：全部 / 待筛选 / 待面试 / 已完成
type TabKey = "ALL" | "PENDING" | "ACCEPTED" | "DONE";
const activeTab = ref<TabKey>("ALL");
const subTab = ref("");
const TABS: { key: TabKey; label: string; status?: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "PENDING", label: "待筛选", status: "PENDING" },
  { key: "ACCEPTED", label: "待面试", status: "ACCEPTED" },
  { key: "DONE", label: "已完成", status: "PASSED,FAILED,ONBOARDED,ONBOARD_DECLINED,DECLINED" },
];
// 已完成的第二行小标签
const SUB_TABS: { label: string; status: string }[] = [
  { label: "已通过", status: "PASSED" },
  { label: "已入职", status: "ONBOARDED" },
  { label: "初筛未通过", status: "DECLINED" },
  { label: "面试未通过", status: "FAILED" },
  { label: "放弃入职", status: "ONBOARD_DECLINED" },
];

const detailVisible = ref(false);
const detailCandidate = ref<CandidateRow | null>(null);
const photoPreviewUrl = ref("");

const reqFormVisible = ref(false);
const reqListVisible = ref(false);
const reqListRef = ref<InstanceType<typeof RequirementListDrawer> | null>(null);

// 店长/管理员/FaHr 可提交用人需求；客户HR 只读查看进度
const canSubmitRequirement = ["admin", "fahr", "manager", "hr"].includes(user?.role ?? "");

function onRequirementSubmitted() {
  reqListRef.value?.reload();
}

/** 组织架构只展示店铺一层，品牌与城市作为次级信息 */
const treeData = computed<TreeNode[]>(() =>
  brands.value.flatMap((b) =>
    b.cities.flatMap((c) =>
      c.stores.map((s) => ({
        key: `store-${s.id}`,
        label: s.name,
        level: "store" as const,
        id: s.id,
        count: s._count?.candidates,
        meta: `${b.name} · ${c.name}`,
        brandName: b.name,
      })),
    ),
  ),
);

/** 页面标题用品牌名称：优先当前选中店铺所属品牌 */
const brandTitle = computed(() => {
  if (selected.value?.brandName) return selected.value.brandName;
  if (brands.value.length === 1) return brands.value[0].name;
  if (brands.value.length > 1) return "全部品牌";
  return "";
});

const treeProps = { label: "label", children: "children" };

/** 按当前数据的文本长度自动计算列宽 */
function widthOf(
  get: (row: CandidateRow) => string | null | undefined,
  header: string,
  opts?: { min?: number; max?: number },
) {
  return columnWidth(candidates.value, get, header, opts);
}

const isMobile = ref(window.matchMedia("(max-width: 768px)").matches);
const drawerVisible = ref(false);

async function loadOrg() {
  try {
    const d = await api<{ brands: BrandNode[] }>("/api/org?published=1");
    brands.value = d.brands;
  } catch {
    ElMessage.error("组织架构加载失败");
  }
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("published", "1");
    const sel = selected.value;
    if (sel) params.set("storeId", String(sel.id));
    const tab = TABS.find((t) => t.key === activeTab.value);
    const effectiveStatus =
      activeTab.value === "DONE" && subTab.value ? subTab.value : tab?.status;
    if (effectiveStatus) params.set("status", effectiveStatus);
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
  selected.value = { level: "store", id: node.id, label: node.label, brandName: node.brandName };
  drawerVisible.value = false;
  page.value = 1;
  load();
}

function clearSelection() {
  selected.value = null;
  page.value = 1;
  load();
}

function onTabChange() {
  subTab.value = "";
  page.value = 1;
  load();
}

function onSubTabChange() {
  page.value = 1;
  load();
}

function openDetail(row: CandidateRow) {
  detailCandidate.value = row;
  detailVisible.value = true;
}

onMounted(() => {
  const mq = window.matchMedia("(max-width: 768px)");
  mq.addEventListener("change", (e) => (isMobile.value = e.matches));
  loadOrg();
  load();
});
</script>

<template>
  <div class="page">
    <PageHeader />

    <div class="page-head">
      <div class="ph-main">
        <div class="eyebrow">Resume Browser</div>
        <h1 class="ph-title">{{ brandTitle }}</h1>
      </div>
      <PageNav active="browser" />
      <div class="ph-actions">
        <el-button size="small" @click="reqListVisible = true">需求进度</el-button>
        <el-button
          v-if="canSubmitRequirement"
          type="primary"
          size="small"
          @click="reqFormVisible = true"
        >
          提交需求
        </el-button>
      </div>
    </div>

    <div class="browser">
      <el-button v-if="isMobile" class="filter-btn" @click="drawerVisible = true">
        <span class="filter-label">{{ selected ? selected.label : "全部店铺" }}</span>
        <span class="filter-arrow">
          <el-icon><Filter /></el-icon>
          筛选
        </span>
      </el-button>
      <el-card v-else class="tree-card" shadow="never">
        <div class="tree-head">
          <div class="eyebrow">组织架构</div>
          <span class="tree-hint">店铺</span>
        </div>
        <el-tree
          class="tree-flat"
          :data="treeData"
          :props="treeProps"
          node-key="key"
          highlight-current
          default-expand-all
          @node-click="onNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node lv-store">
              <span class="tree-text">
                <span class="tree-label">{{ data.label }}</span>
                <span v-if="data.meta" class="tree-meta">{{ data.meta }}</span>
              </span>
              <span v-if="data.count !== undefined" class="tree-count">{{ data.count }}</span>
            </span>
          </template>
        </el-tree>
      </el-card>

      <el-card class="list-card" shadow="never">
        <template #header>
          <div class="toolbar list-toolbar">
            <el-radio-group v-model="activeTab" size="small" @change="onTabChange">
              <el-radio-button v-for="t in TABS" :key="t.key" :value="t.key">{{ t.label }}</el-radio-button>
            </el-radio-group>
            <span class="spacer" />
            <span class="scope-label">
              {{ selected ? selected.label : "全部店铺" }} · 共
              <span class="scope-count">{{ total }}</span> 人
            </span>
            <el-button v-if="selected" link type="primary" size="small" @click="clearSelection">
              清除筛选
            </el-button>
          </div>
          <div v-if="activeTab === 'DONE'" class="sub-tags">
            <el-check-tag :checked="subTab === ''" @change="subTab = ''; onSubTabChange()">全部</el-check-tag>
            <el-check-tag
              v-for="t in SUB_TABS"
              :key="t.status"
              :checked="subTab === t.status"
              @change="subTab = t.status; onSubTabChange()"
            >
              {{ t.label }}
            </el-check-tag>
          </div>
        </template>

        <el-table v-loading="loading" class="data-table" :data="candidates" style="width: 100%">
          <el-table-column
            label="姓名"
            :min-width="widthOf((r) => r.name, '姓名', { min: 150, max: 240 })"
          >
            <template #default="{ row }">
              <div class="cell-person">
                <el-avatar
                  :size="30"
                  :src="row.photo ? withBase(row.photo) : undefined"
                  :class="{ 'avatar-clickable': row.photo }"
                  @click.stop="row.photo && (photoPreviewUrl = withBase(row.photo))"
                >
                  {{ row.name.slice(0, 1) }}
                </el-avatar>
                <div class="cell-person-info">
                  <span class="cell-name">{{ row.name }}</span>
                  <span class="cell-sub">
                    {{ row.gender === "MALE" ? "男" : "女" }}
                    <template v-if="row.age !== null"> · {{ row.age }} 岁</template>
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="门店"
            :min-width="widthOf((r) => r.store.name, '门店', { min: 150, max: 260 })"
          >
            <template #default="{ row }">
              <div class="cell-store">
                <span class="cell-store-name">{{ row.store.name }}</span>
                <span class="cell-sub">{{ row.store.city.brand.name }} · {{ row.store.city.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="STATUS_TAG[row.status] ?? 'info'" size="small">
                {{ STATUS_LABEL[row.status] ?? row.status }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="更新" width="110">
            <template #default="{ row }">
              <span class="cell-time">{{ row.updatedAt ? row.updatedAt.slice(0, 10) : "—" }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>

          <template #empty>
            <el-empty description="暂无人员" :image-size="80" />
          </template>
        </el-table>

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
      </el-card>
    </div>

    <el-drawer v-model="drawerVisible" direction="ltr" size="72%" title="选择店铺">
      <div class="drawer-all" :class="{ sel: !selected }" @click="clearSelection(); drawerVisible = false">
        全部店铺
      </div>
      <el-tree
        class="tree-flat"
        :data="treeData"
        :props="treeProps"
        node-key="key"
        highlight-current
        default-expand-all
        @node-click="onNodeClick"
      >
        <template #default="{ data }">
          <span class="tree-node lv-store">
            <span class="tree-text">
              <span class="tree-label">{{ data.label }}</span>
              <span v-if="data.meta" class="tree-meta">{{ data.meta }}</span>
            </span>
            <span v-if="data.count !== undefined" class="tree-count">{{ data.count }}</span>
          </span>
        </template>
      </el-tree>
    </el-drawer>

    <ResumeDialog v-model="detailVisible" :candidate="detailCandidate" @changed="load" />
    <RequirementFormDialog v-model="reqFormVisible" :brands="brands" @submitted="onRequirementSubmitted" />
    <RequirementListDrawer ref="reqListRef" v-model="reqListVisible" />
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
  padding: 22px 28px 36px;
}

.browser {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

/* ---------- 左侧组织树 ---------- */
.tree-card {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 18px;
}

.tree-card :deep(.el-card__body) {
  padding: 16px 12px 16px 10px;
  max-height: calc(100vh - 210px);
  overflow-y: auto;
}

.tree-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.tree-hint {
  font-size: 11.5px;
  color: var(--text-3);
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

/* 两行内容，节点高度要放开 */
.tree-card :deep(.tree-flat .el-tree-node__content) {
  height: auto;
  min-height: 34px;
  padding: 4px 0;
}

.tree-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.tree-label {
  font-size: 13px;
  color: var(--text-1);
  overflow-wrap: anywhere;
}

.tree-meta {
  font-size: 11px;
  color: var(--text-3);
  overflow-wrap: anywhere;
}

.tree-count {
  margin-left: auto;
  background: var(--ink-050);
  color: var(--text-2);
  border-radius: var(--radius-pill);
  padding: 0 7px;
  font-size: 11px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}

/* ---------- 右侧列表 ---------- */
.list-card {
  flex: 1;
  min-width: 0;
}

.list-card :deep(.el-card__header) {
  padding: 14px 20px 12px;
}

.list-toolbar {
  gap: 12px;
}

.list-toolbar :deep(.el-radio-button__inner) {
  padding: 6px 13px;
  font-size: 12.5px;
}

.sub-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
}

.sub-tags :deep(.el-check-tag) {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 11px;
}

.scope-label {
  font-size: 12.5px;
  font-weight: 400;
  color: var(--text-3);
  white-space: nowrap;
}

.scope-count {
  color: var(--forest-700);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ---------- 表格单元 ---------- */
.cell-person {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell-person-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.cell-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-1);
  line-height: 1.4;
}

.cell-sub {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.4;
}

.cell-store {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.cell-store-name {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.4;
}

.cell-time {
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.avatar-clickable {
  cursor: zoom-in;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 18px;
}

/* ---------- 移动端筛选入口 ---------- */
.filter-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border-color: var(--border-strong);
}

.filter-label {
  font-weight: 500;
  color: var(--text-1);
}

.filter-arrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  font-size: 12.5px;
}

/* ---------- 抽屉内组织树 ---------- */
.drawer-all {
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-xs);
  cursor: pointer;
  margin-bottom: 8px;
  color: var(--text-2);
}

.drawer-all.sel {
  background: var(--forest-600);
  color: var(--text-invert);
}

@media (max-width: 900px) {
  .page {
    padding: 16px 16px 28px;
  }

  .browser {
    flex-direction: column;
    gap: 12px;
  }

  .tree-card {
    width: 100%;
    position: static;
  }

  .tree-card :deep(.el-card__body) {
    max-height: none;
  }

  .list-card :deep(.el-card__header) {
    padding: 12px 14px 10px;
  }

  .pager {
    padding: 0 14px 14px;
  }
}
</style>

<style>
/* 抽屉里的组织树 teleport 到 body，scoped 规则匹配不到，这里用全局类兜底 */
.tree-flat .el-tree-node__content {
  height: auto;
  min-height: 34px;
  padding: 4px 0;
}
</style>
