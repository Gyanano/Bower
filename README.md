# Bower

<p align="right">
  <strong>简体中文</strong> | <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="./BowerLogo.png" alt="Bower logo" width="144" height="144" />
</p>

<p align="center">
  一个本地优先的设计资料归档工具，用于收集灵感、整理看板，并借助 AI 提取视觉线索。
</p>

<p align="center">
  <a href="#tech-stack">
    <img alt="Tech Stack" src="https://img.shields.io/badge/Tech%20Stack-Next.js%2015%20%7C%20FastAPI%20%7C%20SQLite-1c3f73?style=for-the-badge" />
  </a>
  <a href="#browser-extension">
    <img alt="Browser Extension" src="https://img.shields.io/badge/Browser%20Extension-Included-c89b5d?style=for-the-badge" />
  </a>
  <a href="#data--privacy">
    <img alt="Local First" src="https://img.shields.io/badge/Data%20%26%20Privacy-Local--First-6b7f64?style=for-the-badge" />
  </a>
  <a href="#license">
    <img alt="License MIT" src="https://img.shields.io/badge/Open%20Source%20License-MIT-d0aa65?style=for-the-badge" />
  </a>
</p>

<p align="center">
  <a href="#overview">概览</a> ·
  <a href="#feature-surfaces">功能界面</a> ·
  <a href="#tech-stack">技术栈</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#browser-extension">浏览器扩展</a> ·
  <a href="#data--privacy">数据与隐私</a> ·
  <a href="#development">开发</a> ·
  <a href="#license">许可证</a>
</p>

<a id="overview"></a>

## 概览

Bower 是一个面向视觉研究与设计策展的本地优先参考资料管理系统。它适用于那些不仅重视资料存储，也同样重视灵感收集、结构整理与后续复用的工作流。

当前仓库包含：

- 一个基于 Next.js 的 Web 应用，用于归档浏览、合集管理、时间线回顾、上传、登录和设置
- 一个基于 FastAPI 的后端，用于处理元数据、看板、AI 分析、用户偏好和本地账户 API
- 一个内置的浏览器扩展，用于将网页图片发送到 Bower 工作流
- 由 SQLite 支持的本地数据存储，以及基于文件系统的资源存储

<a id="feature-surfaces"></a>

## 功能界面

### Web 应用

- `Archive`：浏览已收集的参考资料，按看板筛选，查看详情，并归档条目
- `Collections`：管理看板并创建新的看板分类
- `Timeline`：按时间顺序回顾资料
- `Upload`：从本地文件新增参考资料
- `Login`：当前应用配置下的本地账户入口
- `Settings`：界面偏好与账户控制
- `AI Settings`：AI 提供商与模型配置

### 浏览器扩展

- 直接在浏览器中触发图片分析或剪藏
- 使用与 Bower 主应用一致的品牌标识和弹窗设置界面
- 作为本地应用的配套入口使用

## 核心能力

- 上传 `PNG`、`JPEG` 和 `WEBP` 灵感图片
- 以内容寻址路径在本地存储文件
- 保存标题、来源 URL、备注、看板归属等元数据
- 通过多种 AI 提供商生成摘要和标签
- 在归档、合集和时间线等浏览模式之间切换
- 创建并管理看板，让策展更清晰
- 将用户偏好与账户数据保留在本地应用环境内

<a id="tech-stack"></a>

## 技术栈

| 层级 | 实现 |
| --- | --- |
| 前端 | Next.js 15、React 19、TypeScript |
| 样式 | 应用级 CSS 与自定义 UI 组件 |
| 后端 | FastAPI、Uvicorn |
| 数据库 | SQLite |
| 文件存储 | 本地文件系统、内容寻址存储 |
| AI 提供商 | OpenAI、Anthropic、Google AI Studio、ByteDance Volcano / Ark |
| 浏览器扩展 | Manifest V3 |
| 工作区工具链 | pnpm workspaces、Turbo、uv |

## 仓库结构

```text
apps/
  server/              FastAPI 后端
  web/                 Next.js 前端
browser-extension/     Manifest V3 扩展
docs/
  Architecture.md      架构设计说明
  DesignSystem.md      UI 方向与设计令牌
  QA/                  冒烟检查清单
scripts/
  dev.mjs              根目录开发启动器
```

<a id="quick-start"></a>

## 快速开始

### 前置要求

- Node.js `18+`
- `pnpm`
- [`uv`](https://docs.astral.sh/uv/)
- 如果要运行图片分析，需要准备一个 AI 提供商密钥

### 安装

```bash
npm run install:web
npm run sync:server
```

### 配置

前端：

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

AI 设置优先在应用内的 `/settings/ai` 页面完成。

为了兼容本地自动化和 CI，仍然保留了旧的环境变量回退方式：

```bash
BOWER_AI_PROVIDER=openai

# OpenAI
BOWER_OPENAI_API_KEY=your-key
BOWER_OPENAI_MODEL=gpt-4.1-mini
BOWER_OPENAI_BASE_URL=https://api.openai.com

# Anthropic
BOWER_ANTHROPIC_API_KEY=your-key
BOWER_ANTHROPIC_MODEL=claude-3-5-haiku-latest

# Google AI Studio
BOWER_GOOGLE_API_KEY=your-key
BOWER_GOOGLE_MODEL=gemini-2.5-flash

# ByteDance Volcano / Ark
BOWER_ARK_API_KEY=your-key
BOWER_ARK_MODEL=your-endpoint-id
```

### 运行

统一本地启动：

```bash
npm run dev
```

或者分别启动各个服务：

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:web
```

本地可用入口：

- Web 应用：`http://localhost:3000`
- API 文档：`http://localhost:8000/docs`

<a id="browser-extension"></a>

## 浏览器扩展

项目内置了一个浏览器扩展，位于 [`browser-extension/`](./browser-extension)。

### 包含的文件

- [`browser-extension/manifest.json`](./browser-extension/manifest.json)
- [`browser-extension/background.js`](./browser-extension/background.js)
- [`browser-extension/content.js`](./browser-extension/content.js)
- [`browser-extension/popup.html`](./browser-extension/popup.html)
- [`browser-extension/popup.js`](./browser-extension/popup.js)

### 以未打包扩展方式加载

1. 打开你所使用的 Chromium 系浏览器扩展页面
2. 启用开发者模式
3. 选择 `Load unpacked`
4. 选择 `browser-extension/` 目录

该扩展现在使用与 Web 应用和仓库品牌一致的 Bower logo。

## API 范围

当前 FastAPI 后端暴露的路由包括：

- `inspirations`
- `image analysis`
- `boards`
- `account`
- `AI settings`
- `preference settings`

所有 API 响应都遵循统一信封结构：

```json
{
  "data": {}
}
```

或者：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

<a id="data--privacy"></a>

## 数据与隐私

Bower 围绕本地优先模型进行设计：

- 图片保存在本地文件系统中
- 元数据保存在本地 SQLite 中
- AI 提供商设置可直接在应用中配置，而不是把密钥硬编码到仓库里
- 仓库只跟踪 `.env.example`，不会跟踪真实 `.env` 文件

### 仓库隐私检查

一次快速仓库扫描发现：

- 没有明显被提交的 API Key、私钥或个人邮箱地址
- 没有被跟踪且包含真实凭据的 `.env` 文件
- 存在如 `Bearer test-key` 之类仅用于测试的占位符，这些是预期内且不敏感的

<a id="development"></a>

## 开发

### 根目录命令

```bash
npm run dev
npm run dev:server
npm run dev:web
npm run install:web
npm run sync:server
npm run test:server
npm run build:web
```

### 前端

```bash
cd apps/web
npm run build
npm run lint
```

### 后端

```bash
uv run --directory apps/server pytest
```

单文件示例：

```bash
uv run --directory apps/server pytest tests/test_inspirations_api.py
```

## 项目状态

该仓库仍处于活跃的产品迭代阶段。当前代码库已经覆盖主要的归档工作流与浏览器扩展集成，但在打包、文档深度和发布规范化等方面仍在持续演进。

<a id="license"></a>

## 许可证

本仓库基于 `MIT` License 发布。详见 [`LICENSE`](./LICENSE)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Gyanano/Bower&type=Date)](https://www.star-history.com/#Gyanano/Bower&Date)
