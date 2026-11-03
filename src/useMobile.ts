import { onUnmounted, ref } from "vue";

/**
 * 断点判断 —— 组件内需要按屏幕宽度切换 DOM 结构时使用。
 * 初值在 setup 阶段同步读取，避免首屏先渲染桌面结构再闪一下。
 */
export function useMobile(maxWidth = 768) {
  const query = `(max-width: ${maxWidth}px)`;
  const isMobile = ref(typeof window !== "undefined" && window.matchMedia(query).matches);
  const mq = typeof window !== "undefined" ? window.matchMedia(query) : null;

  const onChange = (e: MediaQueryListEvent) => {
    isMobile.value = e.matches;
  };

  mq?.addEventListener("change", onChange);
  onUnmounted(() => mq?.removeEventListener("change", onChange));

  return isMobile;
}
