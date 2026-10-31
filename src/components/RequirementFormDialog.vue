<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";
import type { BrandNode } from "../types";

const props = defineProps<{
  modelValue: boolean;
  brands: BrandNode[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submitted: [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const storePath = ref<number[]>([]);
const title = ref("");
const headcount = ref(1);
const urgency = ref("MEDIUM");
const expectedDate = ref("");
const startDate = ref("");
const endDate = ref("");
const salaryAmount = ref<number | undefined>(undefined);
const salaryUnit = ref<"时" | "日">("时");
const description = ref("");
const saving = ref(false);

const cascaderOptions = computed(() =>
  props.brands.map((b) => ({
    id: b.id,
    name: b.name,
    children: b.cities.map((c) => ({
      id: c.id,
      name: c.name,
      children: c.stores
        .filter((s) => s.enabled !== false)
        .map((s) => ({ id: s.id, name: s.name })),
    })),
  })),
);

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    storePath.value = [];
    title.value = "";
    headcount.value = 1;
    urgency.value = "MEDIUM";
    expectedDate.value = "";
    startDate.value = "";
    endDate.value = "";
    salaryAmount.value = undefined;
    salaryUnit.value = "时";
    description.value = "";
  },
);

async function submit() {
  if (!title.value.trim()) {
    ElMessage.warning("请填写职位名称");
    return;
  }
  if (storePath.value.length < 3) {
    ElMessage.warning("请选择所属店铺");
    return;
  }
  saving.value = true;
  try {
    await api("/api/requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: storePath.value[2],
        title: title.value.trim(),
        headcount: headcount.value,
        urgency: urgency.value,
        expectedDate: expectedDate.value,
        startDate: startDate.value,
        endDate: endDate.value,
        salary: salaryAmount.value !== undefined ? `${salaryAmount.value}元/${salaryUnit.value}` : "",
        description: description.value.trim(),
      }),
    });
    ElMessage.success("需求已提交，等待项目管理员确认");
    visible.value = false;
    emit("submitted");
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : "提交失败");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="提交用人需求" width="min(560px, 94vw)" destroy-on-close>
    <div class="eyebrow rf-eyebrow">Job Requirement</div>

    <el-form label-position="top">
      <section class="rf-group">
        <p class="rf-group-title">岗位信息</p>
        <el-form-item label="所属店铺" required>
          <el-cascader
            v-model="storePath"
            :options="cascaderOptions"
            :props="{ value: 'id', label: 'name' }"
            placeholder="品牌 / 城市 / 店铺"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="职位名称" required>
          <el-input v-model="title" placeholder="如：店员 / 收银员" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="招聘人数">
              <el-input-number v-model="headcount" :min="1" :max="9999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="紧急程度">
              <el-select v-model="urgency" style="width: 100%">
                <el-option label="高" value="HIGH" />
                <el-option label="中" value="MEDIUM" />
                <el-option label="低" value="LOW" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section class="rf-group">
        <p class="rf-group-title">时间与薪资</p>
        <el-form-item label="期望到岗">
          <el-date-picker v-model="expectedDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="薪资">
          <el-input-number v-model="salaryAmount" :min="0" :max="99999" placeholder="金额" style="flex: 1" />
          <el-select v-model="salaryUnit" style="width: 110px; margin-left: 8px">
            <el-option label="元/时" value="时" />
            <el-option label="元/日" value="日" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="招聘开始">
              <el-date-picker v-model="startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="招聘结束">
              <el-date-picker v-model="endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section class="rf-group">
        <p class="rf-group-title">岗位描述</p>
        <el-form-item label="任职要求">
          <el-input v-model="description" type="textarea" :rows="3" placeholder="岗位要求、工作内容等" />
        </el-form-item>
      </section>
    </el-form>

    <template #footer>
      <div class="rf-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">提交需求</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.rf-eyebrow {
  margin-bottom: 18px;
}

.rf-group + .rf-group {
  margin-top: 4px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.rf-group-title {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
}

.rf-group:last-child :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.rf-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
