<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { api, withBase } from "../api";
import { getUser } from "../auth";
import { STATUS_LABEL, STATUS_TAG } from "../status";
import { type BrandNode, type CandidateRow } from "../types";
import ResumeDialog from "../components/ResumeDialog.vue";
import RequirementFormDialog from "../components/RequirementFormDialog.vue";
import RequirementListDrawer from "../components/RequirementListDrawer.vue";
import PageHeader from "../components/PageHeader.vue";

interface TreeNode {
  key: string;
  label: string;
  level: "brand" | "city" | "store";
  id: number;
  count?: number;
  children?: TreeNode[];
}

const user = getUser();

const brands = ref<BrandNode[]>([]);
const candidates = ref<CandidateRow[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const selected = ref<{ level: "brand" | "city" | "store"; id: number; label: string } | null>(null);

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
const canSubmitRequirement = ["admin", "fahr", "manager"].includes(user?.role ?? "");

function onRequirementSubmitted() {
  reqListRef.value?.reload();
}

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
    if (sel) {
      if (sel.level === "brand") params.set("brandId", String(sel.id));
      else if (sel.level === "city") params.set("cityId", String(sel.id));
      else params.set("storeId", String(sel.id));
    }
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
  selected.value = { level: node.level, id: node.id, label: node.label };
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
    <PageHeader>
      <el-button v-if="canSubmitRequirement" type="primary" plain size="small" @click="reqFormVisible = true">
        提交需求
      </el-button>
      <el-button size="small" @click="reqListVisible = true">需求进度</el-button>
    </PageHeader>

    <div class="browser">
      <el-button v-if="isMobile" class="filter-btn" @click="drawerVisible = true">
        <span class="filter-label">{{ selected ? selected.label : "全部店铺" }}</span>
        <span class="filter-arrow">筛选 ▾</span>
      </el-button>
      <el-card v-else class="tree-card" shadow="never">
        <div class="tree-tabs">
          <el-radio-group v-model="activeTab" size="small" @change="onTabChange">
            <el-radio-button v-for="t in TABS" :key="t.key" :value="t.key">{{ t.label }}</el-radio-button>
          </el-radio-group>
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
        </div>
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
          <div v-if="isMobile" class="tab-rows">
            <el-radio-group v-model="activeTab" size="small" @change="onTabChange">
              <el-radio-button v-for="t in TABS" :key="t.key" :value="t.key">{{ t.label }}</el-radio-button>
            </el-radio-group>
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
          </div>
          <div class="scope-info">
            <span class="scope-label">
              {{ selected ? selected.label : "全部店铺" }} · 共 {{ total }} 人
            </span>
            <el-button v-if="selected" link type="primary" size="small" @click="clearSelection">
              查看全部
            </el-button>
          </div>
        </div>

        <div v-loading="loading" class="list-body">
          <el-empty v-if="!candidates.length && !loading" description="暂无人员" :image-size="80" />
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

    <el-drawer v-model="drawerVisible" direction="ltr" size="72%" title="选择品牌 / 城市 / 店铺">
      <div class="drawer-all" :class="{ sel: !selected }" @click="clearSelection(); drawerVisible = false">
        全部店铺
      </div>
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
  min-height: 100vh;
}

.browser {
  display: flex;
  gap: 16px;
  align-items: stretch;
  padding: 16px;
}

.tree-card,
.list-card {
  max-height: calc(100vh - 92px);
  overflow: auto;
}

.tree-card {
  width: 300px;
  flex-shrink: 0;
}

.tree-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.tree-tabs :deep(.el-radio-button__inner) {
  padding: 5px 11px;
  font-size: 12px;
}

.tree-subtabs :deep(.el-radio-button__inner) {
  padding: 5px 8px;
  font-size: 11px;
}

.sub-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-tags :deep(.el-check-tag) {
  font-size: 12px;
  padding: 4px 10px;
  font-weight: 400;
  color: #1f2937;
  background: #f3f4f6;
}

.sub-tags :deep(.el-check-tag.is-checked) {
  color: #ffffff;
  background: #1f2937;
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
  gap: 6px;
  font-size: 13px;
}

.lv-brand {
  font-size: 13px;
  font-weight: 600;
}

.lv-city {
  font-size: 13px;
}

.lv-store {
  font-size: 12px;
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

.avatar-clickable {
  cursor: zoom-in;
}

.list-card {
  flex: 1;
  min-width: 0;
  min-height: 400px;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tab-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scope-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scope-label {
  font-size: 13px;
  color: #606266;
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

@media (max-width: 768px) {
  .browser {
    flex-direction: column;
    padding: 10px;
    gap: 10px;
  }

  .filter-btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-left: 0;
  }

  .filter-label {
    font-weight: 600;
  }

  .filter-arrow {
    color: #909399;
    font-size: 12px;
  }

  .list-card {
    max-height: none;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .list-head {
    align-items: flex-start;
    flex-direction: column;
  }
}

.drawer-all {
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
}

.drawer-all.sel {
  background: #1f2937;
  color: #ffffff;
}
</style>
