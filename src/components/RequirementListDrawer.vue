<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";
import type { RequirementRow } from "../types";
import { REQUIREMENT_STATUS_LABEL, REQUIREMENT_STATUS_TAG, URGENCY_LABEL, URGENCY_TAG } from "../status";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const requirements = ref<RequirementRow[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 10;

async function load() {
  loading.value = true;
  try {
    const d = await api<{ requirements: RequirementRow[]; total: number }>(
      `/api/requirements?page=${page.value}&pageSize=${pageSize}`,
    );
    requirements.value = d.requirements;
    total.value = d.total;
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "加载失败");
  } finally {
    loading.value = false;
  }
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    page.value = 1;
    load();
  },
);

defineExpose({ reload: load });
</script>

<template>
  <el-drawer v-model="visible" size="640px">
    <template #header>
      <div class="drawer-head">
        <div class="eyebrow">Requirements</div>
        <p class="drawer-title">用人需求进度</p>
      </div>
    </template>

    <div v-loading="loading" class="body">
      <el-empty v-if="!requirements.length && !loading" description="暂无需求记录" :image-size="80" />
      <div v-for="r in requirements" :key="r.id" class="req-item">
        <div class="req-head">
          <span class="req-title">{{ r.title }}</span>
          <el-tag :type="REQUIREMENT_STATUS_TAG[r.status] ?? 'info'" size="small">
            {{ REQUIREMENT_STATUS_LABEL[r.status] ?? r.status }}
          </el-tag>
          <el-tag :type="URGENCY_TAG[r.urgency] ?? 'info'" size="small" effect="plain">
            紧急度：{{ URGENCY_LABEL[r.urgency] ?? r.urgency }}
          </el-tag>
        </div>
        <div class="req-meta">
          {{ r.store.city.brand.name }} / {{ r.store.city.name }} / {{ r.store.name }}
          · 招 {{ r.headcount }} 人
          <template v-if="r.startDate || r.endDate"> · 周期 {{ r.startDate || "—" }} ~ {{ r.endDate || "—" }}</template>
          <template v-if="r.expectedDate"> · 期望到岗 {{ r.expectedDate }}</template>
          <template v-if="r.salary"> · {{ r.salary }}</template>
        </div>
        <div v-if="r.description" class="req-desc">{{ r.description }}</div>
        <div class="req-foot">
          <span>提交人：{{ r.creator?.username ?? "—" }}</span>
          <span>已推荐 <span class="req-count">{{ r._count.recommendations }}</span> 人</span>
          <span class="req-time">{{ fmtTime(r.createdAt) }}</span>
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
  </el-drawer>
</template>

<style scoped>
.drawer-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-1);
}

.body {
  padding-bottom: 8px;
}

/* 条目之间只用一条细线分隔，不套卡片 */
.req-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.req-item:first-of-type {
  padding-top: 2px;
}

.req-item:last-of-type {
  border-bottom: none;
}

.req-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.req-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}

.req-meta {
  margin-top: 7px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-2);
}

.req-desc {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--text-1);
  white-space: pre-wrap;
}

.req-foot {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-3);
}

.req-count {
  color: var(--forest-700);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.req-time {
  font-variant-numeric: tabular-nums;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>

<style>
/* 抽屉内容被 teleport 到 body，:deep() 无法命中，这里用全局规则限制小屏宽度 */
@media (max-width: 900px) {
  .el-drawer {
    max-width: 100vw;
  }
}
</style>
