# TapNow MVP

这是一个基于 [tapnow-webapp-dev-doc.md](/home/min/work/A_vscode/codex_pro_/tapnow-webapp-dev-doc.md) 落地的可运行 MVP，目标是跑通以下主链路：

- 用户注册/登录
- 画布列表与新建画布
- 画布节点编辑、连线、保存
- 文本、图像放大、视频三类 Mock 任务
- 素材上传与资产库
- 分享画布与克隆画布

当前实现支持两种文本模型来源：

- `mock`：本地模拟结果
- `openai-compatible`：兼容 OpenAI Chat Completions 协议的模型网关

## 项目结构

```text
apps/
  api/   # Express + TypeScript API
  web/   # Vite + React + TypeScript 前端
```

## 运行前准备

环境安装由你自行完成，建议版本：

- Node.js `>= 20`
- npm `>= 10`

## 安装依赖

在仓库根目录执行：

```bash
npm install
```

## 配置环境变量

复制环境变量示例文件：

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

默认配置即可直接本地运行。

如果你要接入真实大模型，需要在 `apps/api/.env` 中配置：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_REGISTRY_JSON=[{"id":"gpt-4.1-mini","label":"GPT-4.1 Mini","provider":"openai-compatible","taskTypes":["text_generate"],"apiKeyEnv":"OPENAI_API_KEY","baseUrl":"https://api.openai.com/v1","modelName":"gpt-4.1-mini"},{"id":"mock-text","label":"Mock Text Model","provider":"mock","taskTypes":["text_generate"]}]
```

`MODEL_REGISTRY_JSON` 是模型注册表，前端模型下拉会自动读取这里的内容。

## 启动方式

分别打开两个终端：

终端 1：

```bash
npm run dev:api
```

终端 2：

```bash
npm run dev:web
```

启动后访问：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:4000`

## 首次使用流程

1. 打开登录页
2. 点击切换到注册模式并注册账号
3. 登录后进入画布列表
4. 新建画布
5. 在画布页添加节点并保存
6. 对文本、图片、视频节点点击运行
7. 任务完成后查看节点输出
8. 将上传素材放入资产库
9. 点击分享获取分享链接
10. 打开分享页并执行克隆

## Mock 任务说明

### 文本任务

文本任务会根据你选择的模型走两种路径：

- `mock`：生成本地模拟文案
- `openai-compatible`：请求真实大模型接口

## 如何自定义添加大模型 API 选项

你只需要修改 `apps/api/.env` 里的 `MODEL_REGISTRY_JSON`。

一个模型项结构如下：

```json
{
  "id": "gpt-4.1-mini",
  "label": "GPT-4.1 Mini",
  "provider": "openai-compatible",
  "taskTypes": ["text_generate"],
  "apiKeyEnv": "OPENAI_API_KEY",
  "baseUrl": "https://api.openai.com/v1",
  "modelName": "gpt-4.1-mini"
}
```

字段说明：

- `id`：前端选择值，必须唯一
- `label`：前端显示名称
- `provider`：目前支持 `mock` 和 `openai-compatible`
- `taskTypes`：当前主要填 `text_generate`
- `apiKeyEnv`：从哪个环境变量读取密钥
- `baseUrl`：模型网关地址
- `modelName`：实际请求时使用的模型名

示例：添加 OpenRouter 模型

```json
{
  "id": "openrouter-claude",
  "label": "Claude via OpenRouter",
  "provider": "openai-compatible",
  "taskTypes": ["text_generate"],
  "apiKeyEnv": "OPENROUTER_API_KEY",
  "baseUrl": "https://openrouter.ai/api/v1",
  "modelName": "anthropic/claude-3.5-sonnet"
}
```

然后在 `apps/api/.env` 中再补：

```bash
OPENROUTER_API_KEY=你的key
```

改完后重启后端，前端下拉会自动出现这个模型选项。

## 火山引擎配置示例

火山引擎方舟支持 OpenAI 兼容接入，所以可以直接走当前的 `openai-compatible` Provider。

在 `apps/api/.env` 中加入：

```bash
ARK_API_KEY=你的火山方舟API Key
MODEL_REGISTRY_JSON=[{"id":"doubao-seed-1-6","label":"Doubao Seed 1.6","provider":"openai-compatible","taskTypes":["text_generate"],"apiKeyEnv":"ARK_API_KEY","baseUrl":"https://ark.cn-beijing.volces.com/api/v3","modelName":"doubao-seed-1-6"},{"id":"mock-text","label":"Mock Text Model","provider":"mock","taskTypes":["text_generate"]}]
```

如果你使用的是火山引擎控制台里其他具体模型，只需要改 `modelName` 和 `label`。

例如再加一个模型：

```json
{
  "id": "doubao-1-5-pro",
  "label": "Doubao 1.5 Pro",
  "provider": "openai-compatible",
  "taskTypes": ["text_generate"],
  "apiKeyEnv": "ARK_API_KEY",
  "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "modelName": "doubao-1-5-pro"
}
```

改完后重启后端：

```bash
npm run dev:api
```

前端文本节点下拉里就会自动出现火山引擎模型选项。

### 图像放大任务

会读取连线输入的上游图片节点结果，并生成一张 SVG 放大结果图。

### 视频任务

会生成一个“视频 Mock 结果”：

- 一张 SVG 预览图
- 一个 JSON 文件作为视频元数据结果

前端会显示其预览和元信息，方便后续切换到真实视频服务。

## 生产化改造建议

当前 MVP 为便于快速运行，使用了：

- 文件存储代替数据库
- 本地磁盘代替对象存储
- 内存定时器代替任务队列

若继续演进，建议替换为：

- PostgreSQL
- Redis + BullMQ
- S3 兼容对象存储
- 真实模型 Provider

## 可用页面

- `/login`
- `/canvases`
- `/canvas/:id`
- `/assets`
- `/shared/:token`

## 已实现接口概览

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/canvases`
- `POST /api/canvases`
- `GET /api/canvases/:id`
- `PUT /api/canvases/:id`
- `PUT /api/canvases/:id/content`
- `POST /api/canvases/:id/clone`
- `POST /api/canvases/:id/share`
- `POST /api/canvases/:id/nodes`
- `PUT /api/nodes/:id`
- `DELETE /api/nodes/:id`
- `POST /api/tasks/text-generate`
- `POST /api/tasks/image-upscale`
- `POST /api/tasks/video-generate`
- `GET /api/tasks/:id`
- `GET /api/models`
- `GET /api/assets`
- `POST /api/assets/upload`
- `POST /api/assets/save-from-node`
- `GET /api/shared/:token`
- `POST /api/shared/:token/clone`

## 当前限制

- 未接入真实 AI 模型
- 视频结果为 Mock 资源
- 无多人协作
- 无支付和额度系统
- 无复杂社区推荐流
