# Legommenders Studio — GitHub Pages 静态演示版

这是从 Legommenders 项目的 `studio/frontend` 分离的独立 React + TypeScript + Vite 前端。部署后由浏览器执行，不需要 Python、API 服务、GPU、数据库或原始项目目录。

## 已保留

- React Flow 画布：拖放、连线、节点替换、参数编辑、布局、缩放、撤销、重做。
- 简体中文 / English，主题切换。
- 74 个组件、14 个模型模板的静态快照，默认加载 NAML。
- Benchmark 的 828 条公开配置快照：搜索、过滤、排序、图表、详情和导出；不请求实时接口。
- Graph JSON 导入 / 导出、浏览器 localStorage 保存与恢复、浏览器内的项目列表。
- 浏览器中的基础结构检查：组件 ID、端口类型、悬空连线、重复输入、必要输入、循环等。
- 参数编辑仅修改图配置，不加载数据或执行模型。

## 已禁用及边界

训练、预检、评估、Python 环境检查、资源下载 / 删除、YAML 编译 / 导入、真实框架验证均不可用。相关按钮禁用并显示中英文说明，数据适配器也会拒绝这些操作。不会产生模拟训练成功或虚构的运行结果。

结构检查不等价于原后端验证，不保证参数、数据或模型能在 Legommenders 中运行。数据集字段预览使用明确标注的静态示例，不读取实际数据集。Benchmark 是采集时的公开数据快照，不代表当前结果；其来源和采集时间随页面展示，详情来自同一快照。

保存位置是当前浏览器、当前站点域名下的 localStorage。清理浏览器数据或更换域名可能丢失保存内容，请用 Graph JSON 导出备份。没有云端保存与多设备同步。

所有原 API 方法由 `src/demo/adapter.ts` 在浏览器内处理，无网络回退。组件、模板、Benchmark 数据在 `src/demo/snapshot.json`，来源说明在 `src/demo/provenance.json`。原 API 外形仅用于兼容现有前端调用。

## 发布到 GitHub Pages（无需本机启动）

1. 在 GitHub 新建一个空仓库，例如 `Legommenders-Studio`。不要在新仓库里自动生成 README，以免首次推送出现冲突。
2. 将本目录的源码推送到仓库根目录，包含隐藏目录 `.github`。不要上传 `node_modules`、`dist`、`.env`。已提供 `.gitignore`。

   如果本目录尚未初始化 Git，可在终端执行（替换 `YOUR_NAME` 和仓库名）：

   ```bash
   git init -b main
   git add .
   git commit -m "Prepare standalone GitHub Pages demo"
   git remote add origin https://github.com/YOUR_NAME/Legommenders-Studio.git
   git push -u origin main
   ```

   若已有 Git 仓库，使用其现有分支和远程配置；工作流默认监听 `main`，其他分支需修改 `.github/workflows/pages.yml` 的 `branches`。

3. 打开仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。
4. 打开 **Actions → Deploy static demo to GitHub Pages**。首次推送若早于 Pages 设置而失败，设置完成后点击 **Run workflow**，或重新运行失败的工作流。
5. 工作流会使用 Node.js 22，执行 `npm ci`、`npm test`、`npm run build`，将 `dist` 作为 Pages 产物部署。完成后在 Pages 设置或部署任务中打开实际站点地址。

普通项目仓库的地址形如 `https://YOUR_NAME.github.io/Legommenders-Studio/`，Benchmark 使用 `#/benchmark` 哈希路由，可直接刷新。Vite 的 `base: './'` 使用相对资源路径，支持仓库子路径及用户主页仓库，无需硬编码仓库名。

不需要服务器密码、访问令牌或额外仓库 Secrets；部署使用工作流内置的 `GITHUB_TOKEN` 和 Pages 权限。如果仓库受组织规则限制，需允许该工作流部署到 `github-pages` 环境。

工作流参考 GitHub 官方文档：
- [配置 Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [使用自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 构建和检查（可选）

本项目无需在本机运行演示。若要自行检查产物，在装有 Node.js 22+ 的环境执行：

```bash
npm ci
npm test
npm run build
```

产物为 `dist/`。不要双击 `index.html` 用 `file://` 访问；发布后通过 GitHub Pages 的 HTTPS 地址访问。构建不需要连接原服务器。

本次已运行生产构建及 120 项单元测试，未启动本地预览或浏览器演示。GitHub Pages 的实际部署需在你上传后由工作流验证。

## 来源与维护

保留上游 MIT LICENSE。代码源于 Legommenders Studio；本地版本只做前端独立演示适配，不包含后端、训练数据或 checkpoint。

如需更新展示数据，可在获得新快照后替换 `src/demo/snapshot.json` 并同步来源说明，再运行测试和构建。请保持现有 JSON 类型结构；当前演示版不会自动同步服务器数据。
