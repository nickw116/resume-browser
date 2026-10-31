<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { api, withBase } from "../api";
import { STATUS_LABEL, STATUS_TAG, INTERVIEW_METHOD_LABEL } from "../status";
import type { CandidateRow, InterviewSlot } from "../types";
import PageHeader from "../components/PageHeader.vue";
import ResumeDialog from "../components/ResumeDialog.vue";

interface InterviewItem {
  candidate: CandidateRow;
  slot: InterviewSlot;
  day: string;
}

const interviews = ref<InterviewItem[]>([]);
const loading = ref(false);

// 当前月份（取每月 1 号）
const today = new Date();
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const selectedDay = ref(dayKey(today));

const detailVisible = ref(false);
const detailCandidate = ref<CandidateRow | null>(null);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const monthLabel = computed(() => `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`);

// 日历格子：6 行 × 7 列，含前后月补位
interface Cell {
  key: string;
  day: number;
  inMonth: boolean;
}
const cells = computed<Cell[]>(() => {
  const first = new Date(currentMonth.value);
  // 周一开头：getDay() 周日=0 → 转成 6
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - lead);
  const list: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    list.push({ key: dayKey(d), day: d.getDate(), inMonth: d.getMonth() === currentMonth.value.getMonth() });
  }
  return list;
});

const byDay = computed(() => {
  const m = new Map<string, InterviewItem[]>();
  for (const it of interviews.value) {
    const list = m.get(it.day) ?? [];
    list.push(it);
    m.set(it.day, list);
  }
  for (const list of m.values()) {
    list.sort((a, b) => a.slot.startAt.localeCompare(b.slot.startAt));
  }
  return m;
});

function cellItems(key: string): InterviewItem[] {
  return byDay.value.get(key) ?? [];
}

const selectedItems = computed(() => cellItems(selectedDay.value));

const selectedLabel = computed(() => {
  const [y, m, d] = selectedDay.value.split("-");
  return `${Number(m)}月${Number(d)}日`;
});

// 状态色：待面试=深灰黑，已通过/已入职=绿，未通过/放弃=灰
function chipClass(it: InterviewItem): string {
  switch (it.candidate.status) {
    case "PASSED":
    case "ONBOARDED":
      return "chip-green";
    case "FAILED":
    case "DECLINED":
    case "ONBOARD_DECLINED":
      return "chip-gray";
    default:
      return "chip-dark";
  }
}

function durationMin(it: InterviewItem): number {
  return Math.round((new Date(it.slot.endAt).getTime() - new Date(it.slot.startAt).getTime()) / 60000);
}

function prevMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
}

function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
}

function goToday() {
  const t = new Date();
  currentMonth.value = new Date(t.getFullYear(), t.getMonth(), 1);
  selectedDay.value = dayKey(t);
}

function openDetail(it: InterviewItem) {
  detailCandidate.value = it.candidate;
  detailVisible.value = true;
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("published", "1");
    params.set("status", "ACCEPTED");
    params.set("pageSize", "500");
    const d = await api<{ candidates: CandidateRow[] }>(`/api/candidates?${params.toString()}`);
    const items: InterviewItem[] = [];
    for (const c of d.candidates) {
      const slot = (c.interviewSlots ?? []).find((s) => s.id === c.acceptedSlotId);
      if (slot) {
        items.push({ candidate: c, slot, day: dayKey(new Date(slot.startAt)) });
      }
    }
    interviews.value = items;
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "加载失败");
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <PageHeader />

    <div class="page-head">
      <div class="ph-main">
        <div class="eyebrow">Interview Schedule</div>
        <h1 class="ph-title">面试日程</h1>
        <p class="ph-desc">按月查看已约定的面试安排，点击日期可展开当天面试明细</p>
      </div>
      <div class="ph-actions">
        <el-button size="small" @click="prevMonth">
          <el-icon><ArrowLeft /></el-icon>
          上个月
        </el-button>
        <el-button size="small" @click="goToday">今天</el-button>
        <el-button size="small" @click="nextMonth">
          下个月
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="sched" v-loading="loading">
      <div class="cal-wrap">
        <div class="cal-card">
          <div class="cal-header">
            <h2 class="cal-title">{{ monthLabel }}</h2>
            <span class="cal-count">
              共 <span class="count-num">{{ interviews.length }}</span> 场面试
            </span>
          </div>

          <div class="week-row">
            <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="week-cell">{{ w }}</span>
          </div>
          <div class="grid-cal">
            <div
              v-for="cell in cells"
              :key="cell.key"
              class="day-cell"
              :class="{ dim: !cell.inMonth, selected: cell.key === selectedDay, today: cell.key === dayKey(new Date()) }"
              @click="selectedDay = cell.key"
            >
              <span class="day-num">{{ cell.day }}</span>
              <div class="chips">
                <div
                  v-for="it in cellItems(cell.key).slice(0, 3)"
                  :key="it.candidate.id"
                  class="chip"
                  :class="chipClass(it)"
                >
                  {{ fmtHM(new Date(it.slot.startAt)) }} {{ it.candidate.name }}
                </div>
                <div v-if="cellItems(cell.key).length > 3" class="chip-more">
                  +{{ cellItems(cell.key).length - 3 }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="side">
        <div class="side-card">
          <div class="side-head">
            <span class="side-date">{{ selectedDay.slice(0, 4) }} · {{ selectedLabel }}</span>
            <span class="side-count">
              <span class="count-num">{{ selectedItems.length }}</span> 场面试
            </span>
          </div>
          <el-empty v-if="!selectedItems.length && !loading" description="当天暂无面试" :image-size="70" />
          <div v-for="it in selectedItems" :key="it.candidate.id" class="iv-row">
            <span class="iv-time">{{ fmtHM(new Date(it.slot.startAt)) }}</span>
            <div class="iv-card" @click="openDetail(it)">
              <el-avatar
                :size="40"
                :src="it.candidate.photo ? withBase(it.candidate.photo) : undefined"
                class="iv-avatar"
              >
                {{ it.candidate.name.slice(0, 1) }}
              </el-avatar>
              <div class="iv-info">
                <p class="iv-name">{{ it.candidate.name }}</p>
                <p class="iv-sub">
                  {{ it.candidate.store.city.brand.name }} · {{ it.candidate.store.name }} · {{ durationMin(it) }}分钟
                  <template v-if="it.candidate.interviewMethod">
                    · {{ INTERVIEW_METHOD_LABEL[it.candidate.interviewMethod] ?? it.candidate.interviewMethod }}
                  </template>
                </p>
                <el-tag :type="STATUS_TAG[it.candidate.status] ?? 'info'" size="small">
                  {{ STATUS_LABEL[it.candidate.status] ?? it.candidate.status }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ResumeDialog v-model="detailVisible" :candidate="detailCandidate" @changed="load" />
  </div>
</template>

<style scoped>
.page {
  padding: 22px 28px 36px;
}

.sched {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.cal-wrap {
  flex: 1.6;
  min-width: 0;
}

/* ---------- 日历卡片 ---------- */
.cal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.cal-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.cal-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text-1);
}

.cal-count,
.side-count {
  font-size: 12.5px;
  color: var(--text-3);
}

.count-num {
  color: var(--forest-700);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ---------- 星期表头 ---------- */
.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--surface-3);
  border-bottom: 1px solid var(--border);
}

.week-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text-3);
  padding: 9px 0;
}

/* ---------- 日期网格 ---------- */
.grid-cal {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-left: 1px solid var(--border);
}

.day-cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  min-height: 96px;
  padding: 8px 7px;
  cursor: pointer;
  transition: background-color 0.18s var(--ease);
}

.day-cell:hover {
  background: var(--surface-2);
}

.day-cell.selected {
  background: var(--forest-050);
  box-shadow: inset 0 0 0 1px var(--forest-600);
}

.day-num {
  display: block;
  width: 22px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-1);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.day-cell.dim .day-num {
  color: var(--ink-200);
}

.day-cell.today .day-num {
  font-weight: 600;
  color: var(--forest-700);
}

.day-cell.today .day-num::after {
  content: "";
  display: block;
  width: 4px;
  height: 4px;
  margin: 3px auto 0;
  border-radius: 50%;
  background: var(--forest-600);
}

/* ---------- 面试条目 ---------- */
.chips {
  margin-top: 7px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chip {
  font-size: 11px;
  line-height: 1.5;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 2px solid var(--forest-600);
  border-radius: var(--radius-xs);
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-1);
}

.chip:hover {
  background: var(--surface-3);
}

.chip-green {
  border-left-color: var(--forest-400);
}

.chip-gray {
  border-left-color: var(--ink-200);
  color: var(--text-2);
}

.chip-more {
  font-size: 11px;
  color: var(--text-3);
  padding-left: 4px;
}

/* ---------- 当天明细 ---------- */
.side {
  flex: 1;
  min-width: 300px;
}

.side-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  padding: 18px 20px;
  min-height: 300px;
}

.side-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.side-date {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-1);
}

.iv-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.iv-row:last-child {
  border-bottom: none;
}

.iv-time {
  width: 44px;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  padding-top: 2px;
}

.iv-card {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 4px 6px;
  margin: -4px -6px;
  transition: background-color 0.18s var(--ease);
}

.iv-card:hover {
  background: var(--surface-3);
}

.iv-avatar {
  flex-shrink: 0;
}

.iv-info {
  min-width: 0;
}

.iv-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}

.iv-sub {
  margin: 3px 0 7px;
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.6;
}

@media (max-width: 900px) {
  .page {
    padding: 16px 16px 28px;
  }

  .sched {
    flex-direction: column;
    gap: 12px;
  }

  .cal-wrap,
  .side {
    width: 100%;
    min-width: 0;
    flex: none;
  }

  .cal-header {
    padding: 14px 14px 12px;
  }

  .day-cell {
    min-height: 62px;
    padding: 6px 4px;
  }

  .chip {
    font-size: 10px;
    padding: 1px 4px;
  }

  .side-card {
    padding: 16px 14px;
  }
}
</style>
