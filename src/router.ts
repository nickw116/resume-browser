import { createRouter, createWebHistory } from "vue-router";
import { getToken } from "./auth";
import LoginPage from "./pages/LoginPage.vue";
import BrowserPage from "./pages/BrowserPage.vue";
import SchedulePage from "./pages/SchedulePage.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/login", component: LoginPage, meta: { public: true, title: "登录" } },
    { path: "/", component: BrowserPage, meta: { title: "首页" } },
    { path: "/schedule", component: SchedulePage, meta: { title: "Schedule" } },
    { path: "/cv", redirect: "/" },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to) => {
  const token = getToken();
  if (to.meta.public) {
    return to.path === "/login" && token ? "/" : true;
  }
  if (!token) {
    return { path: "/login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : {} };
  }
  return true;
});
