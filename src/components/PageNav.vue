<script setup lang="ts">
/**
 * 页面主导航：下移到标题行、与标题基线持平，英文标签、字号放大。
 */
import { useRoute } from "vue-router";

const props = defineProps<{
  active: "browser" | "schedule";
}>();

const route = useRoute();

const items = [
  { key: "browser", label: "Resume Browser", to: "/" },
  { key: "schedule", label: "Schedule", to: "/schedule" },
] as const;

function isActive(key: "browser" | "schedule") {
  if (props.active) return props.active === key;
  return key === "browser" ? route.path === "/" : route.path.startsWith("/schedule");
}
</script>

<template>
  <nav class="page-nav">
    <router-link
      v-for="it in items"
      :key="it.key"
      :to="it.to"
      class="page-nav-item"
      :class="{ active: isActive(it.key) }"
    >
      {{ it.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.page-nav {
  display: flex;
  align-items: flex-end;
  gap: 26px;
  margin-left: 30px;
  margin-bottom: 2px;
}

.page-nav-item {
  position: relative;
  padding: 4px 0 6px;
  font-family: var(--font-display);
  font-size: 17px;
  letter-spacing: 0.01em;
  color: var(--text-3);
  text-decoration: none;
  transition: color 0.18s var(--ease);
}

.page-nav-item::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1.5px;
  background: transparent;
  transition: background-color 0.18s var(--ease);
}

.page-nav-item:hover {
  color: var(--text-1);
}

.page-nav-item.active {
  color: var(--text-1);
}

.page-nav-item.active::after {
  background: var(--forest-600);
}

@media (max-width: 820px) {
  .page-nav {
    gap: 18px;
    margin-left: 0;
    margin-bottom: 0;
  }

  .page-nav-item {
    font-size: 15px;
  }
}
</style>
