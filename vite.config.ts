import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

/**
 * 去掉产物标签上的 crossorigin。
 * 资源与页面同源，不需要 CORS 模式；部分内置浏览器（微信 X5 / WKWebView）
 * 在 CORS 模式下会丢弃样式表，导致整页无样式。
 */
function stripCrossorigin(): Plugin {
  return {
    name: "strip-crossorigin",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(?:="[^"]*")?/g, "");
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [vue(), stripCrossorigin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3100,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
      },
    },
  },
});
