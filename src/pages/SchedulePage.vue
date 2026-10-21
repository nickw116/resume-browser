<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { api, withBase } from "../api";
import { STATUS_LABEL, INTERVIEW_METHOD_LABEL } from "../status";
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

    <div class="sched" v-loading="loading">
      <div class="cal-wrap">
        <div class="cal-header">
          <h1 class="cal-title">Schedule</h1>
          <div class="cal-controls">
            <el-button size="small" plain @click="prevMonth">上个月</el-button>
            <span class="month-label">{{ monthLabel }}</span>
            <el-button size="small" plain @click="nextMonth">下个月</el-button>
            <el-button size="small" plain @click="goToday">今天</el-button>
          </div>
        </div>

        <div class="cal-card">
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
            <span class="side-date">{{ selectedLabel }}</span>
            <span class="side-count">{{ selectedItems.length }} 场面试</span>
          </div>
          <el-empty v-if="!selectedItems.length && !loading" description="当天暂无面试" :image-size="70" />
          <div v-for="it in selectedItems" :key="it.candidate.id" class="iv-row">
            <span class="iv-time">{{ fmtHM(new Date(it.slot.startAt)) }}</span>
            <div class="iv-card" @click="openDetail(it)">
              <el-avatar
                :size="52"
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
                <span class="iv-tag" :class="chipClass(it)">{{ STATUS_LABEL[it.candidate.status] ?? it.candidate.status }}</span>
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
  min-height: 100vh;
  background: #f5f4f1;
}

.sched {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  align-items: flex-start;
}

.cal-wrap {
  flex: 1.5;
  min-width: 0;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cal-title {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.cal-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  min-width: 92px;
  text-align: center;
}

.cal-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px;
}

.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}

.week-cell {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  padding: 6px 0;
}

.grid-cal {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.day-cell {
  background: #f7f6f3;
  border: 2px solid transparent;
  border-radius: 10px;
  min-height: 96px;
  padding: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.day-cell:hover {
  border-color: #d1d5db;
}

.day-cell.selected {
  border-color: #111827;
}

.day-cell.dim .day-num {
  color: #c4c9d1;
}

.day-cell.today .day-num {
  color: #ffffff;
  background: #111827;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.day-num {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.chips {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chip {
  font-size: 11px;
  line-height: 1.5;
  border-radius: 5px;
  padding: 1px 7px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
}

.chip-dark {
  background: #1f2937;
}

.chip-green {
  background: #2f7d4f;
}

.chip-gray {
  background: #9ca3af;
}

.chip-more {
  font-size: 11px;
  color: #6b7280;
  padding-left: 4px;
}

.side {
  flex: 1;
  min-width: 300px;
}

.side-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  min-height: 300px;
}

.side-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.side-date {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.side-count {
  font-size: 12px;
  color: #6b7280;
}

.iv-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.iv-time {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  padding-top: 14px;
  width: 44px;
  flex-shrink: 0;
}

.iv-card {
  flex: 1;
  display: flex;
  gap: 12px;
  background: #f7f6f3;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.iv-card:hover {
  background: #efede8;
}

.iv-avatar {
  flex-shrink: 0;
}

.iv-info {
  min-width: 0;
}

.iv-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.iv-sub {
  margin: 3px 0 6px;
  font-size: 12px;
  color: #6b7280;
}

.iv-tag {
  display: inline-block;
  font-size: 11px;
  border-radius: 5px;
  padding: 1px 8px;
  color: #ffffff;
}

@media (max-width: 900px) {
  .sched {
    flex-direction: column;
    padding: 10px;
  }

  .cal-wrap,
  .side {
    width: 100%;
    min-width: 0;
    flex: none;
  }

  .cal-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .day-cell {
    min-height: 64px;
    padding: 4px;
  }

  .chip {
    font-size: 10px;
    padding: 0 4px;
  }
}
</style>
