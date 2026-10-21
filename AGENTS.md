# resume-browser 电子简历浏览器

FaHrService 的电子简历浏览前端，供不同角色（admin / fahr / manager / hr）查看候选人简历。纯前端项目，API 由 FaHrService 后端提供（`/home/ubuntu/FaHrService`）。

## 技术栈

- Vue 3 + Vite + Element Plus + vue-router，TypeScript，ESM
- 无独立后端，dev 时 `/api` 代理到 `http://localhost:5000`（FaHrService，`PORT=5000 npm start`）

## 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 开发，端口 3100，/api 代理到 5000
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
npx tsc --noEmit # 类型检查
```

## 目录结构

```
src/
├── api.ts         # fetch 封装：自动带 Bearer token，401 跳登录，withBase() 处理 BASE_URL
├── auth.ts        # token 存取
├── router.ts      # 路由守卫：未登录跳 /login
├── types.ts       # Role（admin/fahr/manager/hr）、组织树等类型
├── status.ts      # 状态枚举/标签
├── pages/         # LoginPage、BrowserPage（简历浏览主页）
└── components/    # ResumeDialog（简历详情弹窗）
```

## 约定

- `@` 别名指向 `src/`
- 所有 API 请求走 `api.ts` 的 `api<T>()`，不要直接 fetch
- 路径用 `withBase()` 包装，兼容非根部署
- 后端 API 定义见 FaHrService 的 `README.md` 与 `server/index.ts`
