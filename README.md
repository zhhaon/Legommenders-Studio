# Legommenders Studio · 纯前端演示版

独立的 React + TypeScript + Vite 项目，可由 GitHub Pages 托管，无需 Python、GPU、数据库、后端 API 或服务器连接。

## 功能

- 静态组件库：60 个组件，包含参数、端口和类型信息。
- 静态模板：14 个模型图，包括 NAML、NRMS、LSTUR、DeepFM 等。
- 保留画布拖拽、连线、节点增删、组件替换、参数修改、布局、缩放、撤销和重做。
- 保留 JSON 导入、导出、浏览器保存和恢复、主题切换。
- 浏览器基础检查：组件和端口存在性、端口类型、必填连线、参数类型和范围、任务类型、重复连接和环路。
- 可查看并下载模板原始参考 YAML。参考 YAML 不随画布编辑更新。
- 禁用训练、评估、预检、Python 编译、框架验证、YAML 导入、运行日志和实验结果；不伪造训练或评估结果。

画布中的训练配置仍可编辑、导出，但不会执行。数据集字段选择使用静态示例列，不会读取真实数据或下载 Hugging Face 资源。基础图检查不等于原框架的完整验证，尤其不检查真实资源、张量维度或运行时兼容性。

保存仅写入当前浏览器的 localStorage，不会上传。清理站点数据、换浏览器或换站点域名后，无法访问原来的本地保存；建议导出 JSON 备份。同一域名下的其他演示副本可能共享本地保存。

## 目录

```text
.github/workflows/deploy-pages.yml  GitHub Pages 自动构建与部署
frontend/
  src/demo/snapshot.json            静态组件、模板、参考 YAML
  src/demo/runtime.ts               浏览器检查和本地存储
  src/api/client.ts                 本地适配层，不发后端网络请求
  src/canvas/                       原有画布功能
  src/store/                        编辑器状态、撤销重做
  dist/                             已构建静态产物（不提交 Git）
README.md
LICENSE
```

`base: './'` 已配置，兼容 `https://用户名.github.io/仓库名/` 和根域名部署。项目没有需要服务端回退的路径路由。

## 发布到 GitHub Pages

上传的是当前整个项目文件夹，保留 `frontend/` 和 `.github/` 的层级。无需上传服务器原项目、数据集、模型权重或任何 SSH 凭据。

1. 在 GitHub 创建一个空仓库，例如 `Legommenders-Studio`。使用免费个人账户时，可以选择公开仓库。不要让 GitHub 预先生成 README，避免首次推送产生冲突。
2. 在本机终端执行以下命令，把 `YOUR_USERNAME` 和仓库名替换成自己的值：

   ```bash
   git init -b main
   git add .
   git commit -m "Add standalone Legommenders Studio demo"
   git remote add origin https://github.com/YOUR_USERNAME/Legommenders-Studio.git
   git push -u origin main
   ```

   GitHub 认证使用你自己的 GitHub 凭据、令牌或 SSH key，与服务器登录信息无关。如果当前目录之后已经初始化为 Git 仓库，跳过 `git init`；如果已配置 origin，先确认其地址。

3. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 打开 **Actions → Deploy static demo to GitHub Pages**。首次 push 通常会触发工作流；如果当时 Pages 尚未启用导致失败，启用后点击 **Re-run all jobs**，或在该工作流页面使用 **Run workflow**。
5. 等待 build、deploy 成功。Pages 设置页面和 deploy 任务会显示访问地址，通常为：

   ```text
   https://YOUR_USERNAME.github.io/Legommenders-Studio/
   ```

后续推送到 `main` 会重新运行测试、构建并部署。若使用其他默认分支，请同步修改工作流中的 `branches: [main]`。

工作流使用 Node.js 22，执行 `npm ci`、`npm test`、`npm run build`，只发布 `frontend/dist`。不需要手动创建 `gh-pages` 分支，不需要填写额外部署密钥，也不需要安装本机 Node 来完成这次发布。

GitHub 官方说明：
- [配置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [使用自定义工作流部署 Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 开发与检查（可选）

需要 Node.js 22 和 npm；发布流程可完全由 GitHub Actions 完成，无需在本机演示。

```bash
cd frontend
npm ci
npm test
npm run build
```

生成结果位于 `frontend/dist/`，可直接交给静态托管服务。源码仓库应提交 package-lock.json，但不提交 node_modules、dist、环境文件或日志。

## 来源与分离范围

本地源码复制自原项目 `studio/frontend`。未复制 Python 后端、数据集、训练产物、运行历史或服务器凭据。

组件定义通过只读导出取得；导出进程禁用 Python 字节码并拦截文件写入。动态模板解析触发写操作时被阻止，因此演示模板直接采用原前端已有的 `src/canvas/fixtures/modelGraphs.json` 静态图，配合原模板元数据和参考 YAML，不在服务器上生成模板文件。旧的 ranking 数据集别名 `dataset.mindrb` 映射为注册表中的 `dataset.mindrb-with-id`。

后续本地改动仅作用于本项目。服务器源码未被修改。原项目 MIT 许可证保留于 LICENSE。

验证：54 个测试通过，生产构建成功；未启动本机演示，未上传或部署到 GitHub。
