<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, withBase } from "../api";
import { getUser } from "../auth";
import { STATUS_LABEL, STATUS_TAG } from "../status";
import type { CandidateRow } from "../types";

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ candidate: CandidateRow | null }>();
const emit = defineEmits<{ changed: [] }>();

const acting = ref(false);
const chosenSlotId = ref<number | null>(null);
const photoPreview = ref(false);

const role = getUser()?.role ?? "hr";
// 店长可操作约面确认和面试结果；入职确认和重置仅管理员/fahr；客户hr 只读
const canInterview = ["admin", "fahr", "manager"].includes(role);
const canOnboard = ["admin", "fahr"].includes(role);

watch(visible, (v) => {
  if (v) chosenSlotId.value = null;
});

const status = computed(() => props.candidate?.status ?? "");
const acceptedSlot = computed(
  () => props.candidate?.interviewSlots.find((s) => s.id === props.candidate?.acceptedSlotId) ?? null,
);

const stepActive = computed(() => {
  switch (status.value) {
    case "PENDING":
    case "DECLINED":
      return 0;
    case "ACCEPTED":
      return 1;
    case "PASSED":
    case "FAILED":
      return 2;
    default:
      return 3;
  }
});

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtSlot(s: { startAt: string; endAt: string }) {
  const a = new Date(s.startAt);
  const b = new Date(s.endAt);
  return `${a.getFullYear()}/${a.getMonth() + 1}/${a.getDate()} ${pad2(a.getHours())}:${pad2(a.getMinutes())} ~ ${pad2(b.getHours())}:${pad2(b.getMinutes())}`;
}

type Action =
  | "accept-interview"
  | "decline-interview"
  | "pass"
  | "fail"
  | "onboard"
  | "decline-onboard"
  | "reset";

async function act(action: Action) {
  const c = props.candidate;
  if (!c) return;
  if (action === "accept-interview" && !chosenSlotId.value) {
    ElMessage.warning("请先选择一个面试时间");
    return;
  }
  const tips: Record<Action, string> = {
    "accept-interview": `确认 ${c.name} 已约面？`,
    "decline-interview": `确认 ${c.name} 拒绝本次约面？`,
    pass: `确认 ${c.name} 面试通过？`,
    fail: `确认 ${c.name} 面试未通过？`,
    onboard: `确认 ${c.name} 入职？`,
    "decline-onboard": `确认 ${c.name} 放弃入职？`,
    reset: "重置后将清空约面状态，流程回到「待约面」。确定重置？",
  };
  try {
    await ElMessageBox.confirm(tips[action], "提示", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  acting.value = true;
  try {
    await api(`/api/candidates/${c.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        slotId: action === "accept-interview" ? chosenSlotId.value : undefined,
      }),
    });
    ElMessage.success("已更新");
    emit("changed");
    visible.value = false;
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "操作失败");
  } finally {
    acting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="`电子简历 · ${candidate?.name ?? ''}`" width="720px">
    <div v-if="candidate" class="body">
      <div class="p-head">
        <el-avatar
          :size="72"
          :src="candidate.photo ? withBase(candidate.photo) : undefined"
          :class="{ 'avatar-clickable': candidate.photo }"
          @click="candidate.photo && (photoPreview = true)"
        >
          {{ candidate.name.slice(0, 1) }}
        </el-avatar>
        <div class="p-head-info">
          <p class="p-name">{{ candidate.name }}</p>
          <p class="p-meta">
            {{ candidate.gender === "MALE" ? "男" : "女" }}
            <template v-if="candidate.age !== null"> · {{ candidate.age }} 岁</template>
            <template v-if="candidate.phone"> · {{ candidate.phone }}</template>
          </p>
          <p class="p-meta p-store">
            应聘门店：{{ candidate.store.city.brand.name }} / {{ candidate.store.city.name }} /
            {{ candidate.store.name }}
          </p>
        </div>
        <el-tag :type="STATUS_TAG[status] ?? 'info'" size="small">
          {{ STATUS_LABEL[status] ?? status }}
        </el-tag>
      </div>

      <el-steps :active="stepActive" align-center finish-status="success" class="p-steps">
        <el-step title="确认约面" />
        <el-step title="参加面试" />
        <el-step title="面试结果" />
        <el-step title="入职确认" />
      </el-steps>

      <div v-if="candidate.workExperiences.length" class="p-section">
        <p class="p-title">工作经历</p>
        <div v-for="w in candidate.workExperiences" :key="w.id" class="p-work">
          <div class="p-work-head">
            <span class="p-company">{{ w.company }}</span>
            <span class="p-period">{{ w.startDate || "—" }} ~ {{ w.endDate || "至今" }}</span>
          </div>
          <p v-if="w.description" class="p-desc">{{ w.description }}</p>
        </div>
      </div>

      <div v-if="candidate.remark" class="p-section">
        <p class="p-title">备注</p>
        <p class="p-desc">{{ candidate.remark }}</p>
      </div>

      <div class="p-section">
        <p class="p-title">约面确认</p>
        <template v-if="status === 'PENDING' || status === 'DECLINED'">
          <p v-if="status === 'DECLINED'" class="p-hint">已拒绝上次约面，可重新选择时间约面。</p>
          <template v-if="candidate.interviewSlots.length">
            <template v-if="canInterview">
              <el-radio-group v-model="chosenSlotId" class="slot-list">
                <el-radio v-for="s in candidate.interviewSlots" :key="s.id" :value="s.id" class="slot-radio">
                  {{ fmtSlot(s) }}
                </el-radio>
              </el-radio-group>
              <div class="actions">
                <el-button type="primary" size="small" :loading="acting" @click="act('accept-interview')">
                  确认约面
                </el-button>
                <el-button
                  v-if="status === 'PENDING'"
                  type="danger"
                  plain
                  size="small"
                  :loading="acting"
                  @click="act('decline-interview')"
                >
                  拒绝约面
                </el-button>
              </div>
            </template>
            <template v-else>
              <div v-for="s in candidate.interviewSlots" :key="s.id" class="p-slot">{{ fmtSlot(s) }}</div>
            </template>
          </template>
          <p v-else class="p-hint">该人员还没有可面试时间，请先在 FaHrService 人员管理中添加。</p>
        </template>
        <p v-else-if="status === 'ACCEPTED'" class="p-hint">
          已约面：{{ acceptedSlot ? fmtSlot(acceptedSlot) : "—" }}
        </p>
        <p v-else class="p-hint">{{ STATUS_LABEL[status] ?? status }}</p>
      </div>

      <div v-if="status === 'ACCEPTED' && canInterview" class="p-section">
        <p class="p-title">面试结果</p>
        <div class="actions">
          <el-button type="success" size="small" :loading="acting" @click="act('pass')">面试通过</el-button>
          <el-button type="danger" plain size="small" :loading="acting" @click="act('fail')">面试未通过</el-button>
        </div>
      </div>

      <div v-if="status === 'PASSED' && canOnboard" class="p-section">
        <p class="p-title">入职确认</p>
        <div class="actions">
          <el-button type="success" size="small" :loading="acting" @click="act('onboard')">确认入职</el-button>
          <el-button type="danger" plain size="small" :loading="acting" @click="act('decline-onboard')">
            放弃入职
          </el-button>
        </div>
      </div>

      <div v-if="canOnboard" class="ops">
        <el-button link type="warning" size="small" :loading="acting" @click="act('reset')">
          重置招聘流程
        </el-button>
      </div>
    </div>

    <el-image-viewer
      v-if="photoPreview && candidate?.photo"
      :url-list="[withBase(candidate.photo)]"
      teleported
      @close="photoPreview = false"
    />
  </el-dialog>
</template>

<style scoped>
.p-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.p-head-info {
  flex: 1;
  min-width: 0;
}

.p-name {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.p-meta {
  margin: 4px 0 0;
  color: #606266;
  font-size: 14px;
}

.p-store {
  color: #909399;
  font-size: 13px;
}

.avatar-clickable {
  cursor: zoom-in;
}

.p-steps {
  margin: 20px 0 4px;
}

.p-section {
  margin-top: 16px;
}

.p-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}

.p-work {
  padding: 8px 0;
  border-bottom: 1px dashed #e4e7ed;
}

.p-work:last-child {
  border-bottom: none;
}

.p-work-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.p-company {
  font-weight: 600;
  font-size: 14px;
}

.p-period {
  color: #909399;
  font-size: 13px;
}

.p-desc {
  margin: 4px 0 0;
  color: #606266;
  font-size: 14px;
  white-space: pre-wrap;
}

.p-hint {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.slot-radio {
  margin-right: 0;
  height: auto;
  font-size: 14px;
}

.p-slot {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
}

.actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ops {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
