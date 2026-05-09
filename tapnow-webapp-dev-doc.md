# TapNow 类网页应用开发文档

## 1. 文档说明

本文档基于公开产品形态，对 TapNow 类 AI 创意画布网页应用进行逆向拆解，目标是输出一份可直接指导 MVP 开发的实施文档。

文档适用场景：

- 0 到 1 搭建同类 AI 创作 Web App
- 团队进行产品拆解、技术评审、任务排期
- 将模糊想法落成前后端开发任务

本文档不等价于官方源码分析，而是基于公开功能表现整理出的工程设计方案。

---

## 2. 产品目标

### 2.1 产品定义

目标产品是一个以无限画布为核心的 AI 创作平台，用户可在同一工作区内完成：

- 文本创意生成
- 图片生成与编辑
- 视频生成与延展
- 素材管理与复用
- 工作流保存与复刻
- 项目分享与克隆

### 2.2 目标用户

- AI 内容创作者
- 短视频与广告创意团队
- 视觉设计师
- 品牌和电商内容团队
- 独立创作者和提示词工程用户

### 2.3 MVP 范围

第一阶段只做最小可用闭环，不追求完整模型能力，不做复杂社区体系。

MVP 必须完成：

- 账号登录
- 我的画布列表
- 新建画布
- 画布拖拽与连线
- 文本节点
- 图片上传节点
- 图片生成节点
- 视频生成节点
- 异步任务轮询
- 画布保存与恢复
- 分享链接
- 克隆画布

MVP 暂不做：

- 高级图像编辑器
- 多人协作
- 支付系统
- 复杂权限体系
- 公开社区广场推荐流

---

## 3. 核心功能拆解

### 3.1 账号系统

功能：

- 注册
- 登录
- 用户资料读取
- 退出登录

输出结果：

- 用户拥有独立工作区
- 用户仅访问自己的私有画布和资产

### 3.2 画布系统

功能：

- 新建画布
- 删除画布
- 重命名画布
- 进入画布编辑页
- 保存与恢复画布状态

画布内能力：

- 缩放
- 平移
- 节点拖动
- 框选
- 连线
- 删除
- 复制

### 3.3 节点系统

MVP 节点类型：

- `text`
- `image_upload`
- `image_generate`
- `video_generate`

扩展节点类型：

- `image_edit`
- `image_fusion`
- `image_upscale`
- `video_analyze`
- `asset_ref`

### 3.4 异步生成系统

功能：

- 创建 AI 任务
- 排队执行
- 查询任务状态
- 返回结果资源
- 失败重试

任务类型：

- 文本生成
- 图片生成
- 视频生成
- 图片处理

### 3.5 资产库

功能：

- 保存生成结果为资产
- 资产打标签
- 从资产库重新插入到画布

MVP 中资产只需支持：

- 图片
- 视频
- 文本结果快照

### 3.6 分享与克隆

功能：

- 生成只读分享链接
- 浏览公开画布
- 克隆共享画布到当前账号

---

## 4. 业务流程

### 4.1 主创作链路

1. 用户登录
2. 进入我的画布
3. 新建画布
4. 创建文本节点，输入创意描述
5. 创建图片生成节点，并引用文本节点输出
6. 上传参考图或附加风格图
7. 提交图片生成任务
8. 查看生成结果
9. 创建视频生成节点，并引用图片结果
10. 提交视频任务
11. 保存画布
12. 分享或克隆

### 4.2 分享链路

1. 用户完成一张画布
2. 用户点击分享
3. 系统生成公开访问链接
4. 其他用户打开链接
5. 其他用户点击克隆
6. 系统复制一份新画布到其个人空间

### 4.3 资产复用链路

1. 用户将节点结果保存为资产
2. 资产进入个人库
3. 用户在新画布中选取已有资产
4. 系统创建资产引用节点

---

## 5. 系统架构

### 5.1 总体架构

推荐采用前后端分离架构：

- 前端：Web 单页应用
- 后端 API：业务接口层
- 任务调度层：AI 任务异步执行
- 对象存储：图片/视频资源
- 数据库：用户、画布、节点、任务、资产

逻辑结构如下：

```text
Browser
  -> Frontend App
  -> API Gateway / Backend Service
      -> Auth Service
      -> Canvas Service
      -> Node Service
      -> Asset Service
      -> Share Service
      -> Task Service
          -> Queue
          -> Worker
          -> Model Providers
      -> Object Storage
      -> Database
```

### 5.2 前端推荐技术栈

- 框架：`Next.js` 或 `React + Vite`
- 语言：`TypeScript`
- 状态管理：`Zustand` 或 `Redux Toolkit`
- 画布库：`React Flow` 或自研基于 `Konva` / `Canvas`
- 请求层：`TanStack Query`
- 表单：`React Hook Form`
- 样式：`Tailwind CSS` 或模块化 CSS

MVP 推荐：

- `Next.js + TypeScript + React Flow + Zustand + TanStack Query`

原因：

- 画布节点连线能力成熟
- 便于快速搭建编辑器
- SSR 不是核心，但 Next.js 便于路由和后续扩展

### 5.3 后端推荐技术栈

- 运行时：`Node.js`
- 框架：`NestJS` 或 `Express`
- 数据库：`PostgreSQL`
- ORM：`Prisma`
- 队列：`BullMQ`
- 缓存：`Redis`
- 对象存储：`S3` 兼容存储
- 鉴权：`JWT` 或 `Session + Cookie`

MVP 推荐：

- `NestJS + PostgreSQL + Prisma + Redis + BullMQ + S3`

### 5.4 AI 模型接入层

建议将外部模型调用统一封装为 Provider 层，避免业务代码直接依赖单一模型平台。

接口抽象：

- `generateText(input)`
- `generateImage(input)`
- `generateVideo(input)`
- `upscaleImage(input)`
- `analyzeVideo(input)`

支持后续接入：

- OpenAI
- Replicate
- Runway
- Luma
- 其他图片和视频模型服务

---

## 6. 前端模块设计

### 6.1 页面结构

核心页面：

- `/login`
- `/canvases`
- `/canvas/:id`
- `/shared/:shareId`
- `/assets`

### 6.2 前端模块拆分

#### 模块 A：认证模块

职责：

- 登录注册
- Token 存储
- 会话恢复

#### 模块 B：画布页框架

职责：

- 左侧工具栏
- 中间画布
- 右侧属性面板
- 顶部操作栏

#### 模块 C：画布引擎

职责：

- 节点渲染
- 连线渲染
- 选中态
- 缩放平移
- 撤销重做

前端状态建议拆分为：

- `canvasMeta`
- `nodes`
- `edges`
- `viewport`
- `selection`
- `history`

#### 模块 D：节点配置面板

职责：

- 编辑 prompt
- 选择参考图
- 设置参数
- 提交任务

#### 模块 E：任务状态展示

职责：

- 显示生成中状态
- 显示错误状态
- 轮询任务结果

#### 模块 F：分享页

职责：

- 只读渲染共享画布
- 提供克隆入口

### 6.3 前端关键状态结构

```ts
type CanvasState = {
  canvasId: string;
  title: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  updatedAt: string;
};
```

```ts
type CanvasNode = {
  id: string;
  type: 'text' | 'image_upload' | 'image_generate' | 'video_generate';
  position: { x: number; y: number };
  data: Record<string, unknown>;
  status: 'idle' | 'pending' | 'running' | 'success' | 'failed';
  output?: NodeOutput;
};
```

```ts
type CanvasEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  referenceType: 'prompt' | 'image' | 'video' | 'style';
};
```

---

## 7. 后端服务设计

### 7.1 服务拆分

#### Auth Service

负责：

- 注册
- 登录
- Token 校验

#### Canvas Service

负责：

- 新建画布
- 查询画布
- 保存画布
- 克隆画布

#### Node Service

负责：

- 节点增删改查
- 节点参数校验
- 节点引用关系校验

#### Task Service

负责：

- 任务创建
- 任务入队
- 任务状态更新
- 结果写回节点

#### Asset Service

负责：

- 资产入库
- 资产查询
- 资产复用

#### Share Service

负责：

- 创建分享链接
- 查询分享画布
- 分享权限控制

---

## 8. 数据模型设计

### 8.1 用户表 `users`

字段：

- `id`
- `email`
- `password_hash`
- `name`
- `avatar_url`
- `created_at`
- `updated_at`

### 8.2 画布表 `canvases`

字段：

- `id`
- `owner_id`
- `title`
- `description`
- `visibility`
- `snapshot_version`
- `created_at`
- `updated_at`

说明：

- `visibility` 取值：`private` / `shared`

### 8.3 节点表 `canvas_nodes`

字段：

- `id`
- `canvas_id`
- `type`
- `position_x`
- `position_y`
- `width`
- `height`
- `status`
- `data_json`
- `output_json`
- `created_at`
- `updated_at`

### 8.4 连线表 `canvas_edges`

字段：

- `id`
- `canvas_id`
- `source_node_id`
- `target_node_id`
- `reference_type`
- `created_at`

### 8.5 任务表 `generation_tasks`

字段：

- `id`
- `user_id`
- `canvas_id`
- `node_id`
- `task_type`
- `provider`
- `status`
- `request_json`
- `response_json`
- `error_message`
- `created_at`
- `started_at`
- `finished_at`

说明：

- `status` 取值：`pending` / `running` / `success` / `failed`

### 8.6 资产表 `assets`

字段：

- `id`
- `owner_id`
- `type`
- `title`
- `file_url`
- `thumbnail_url`
- `metadata_json`
- `source_task_id`
- `created_at`

### 8.7 分享表 `canvas_shares`

字段：

- `id`
- `canvas_id`
- `share_token`
- `created_by`
- `created_at`
- `expired_at`

---

## 9. API 设计

以下接口以 REST 风格为主，MVP 足够使用。

### 9.1 认证接口

#### `POST /api/auth/register`

请求：

```json
{
  "email": "user@example.com",
  "password": "12345678",
  "name": "demo"
}
```

#### `POST /api/auth/login`

请求：

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

返回：

```json
{
  "token": "jwt-token",
  "user": {
    "id": "u_1",
    "email": "user@example.com",
    "name": "demo"
  }
}
```

### 9.2 画布接口

#### `GET /api/canvases`

获取当前用户画布列表。

#### `POST /api/canvases`

创建新画布。

```json
{
  "title": "My First Canvas"
}
```

#### `GET /api/canvases/:id`

获取画布详情及节点结构。

#### `PUT /api/canvases/:id`

更新画布元信息。

#### `PUT /api/canvases/:id/content`

保存整张画布内容。

请求：

```json
{
  "nodes": [],
  "edges": [],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

#### `POST /api/canvases/:id/clone`

克隆一张画布到当前用户空间。

### 9.3 节点接口

#### `POST /api/canvases/:id/nodes`

创建节点。

#### `PUT /api/nodes/:id`

更新节点基础信息。

#### `DELETE /api/nodes/:id`

删除节点。

### 9.4 任务接口

#### `POST /api/tasks/text-generate`

#### `POST /api/tasks/image-generate`

#### `POST /api/tasks/video-generate`

统一请求格式建议：

```json
{
  "canvasId": "c_1",
  "nodeId": "n_1",
  "input": {
    "prompt": "a fashion ad in studio lighting",
    "referenceImageIds": ["asset_1"],
    "duration": 5
  }
}
```

返回：

```json
{
  "taskId": "task_1",
  "status": "pending"
}
```

#### `GET /api/tasks/:id`

查询任务状态。

返回：

```json
{
  "id": "task_1",
  "status": "success",
  "result": {
    "assetId": "asset_2",
    "fileUrl": "https://cdn.example.com/asset_2.png"
  }
}
```

### 9.5 资产接口

#### `GET /api/assets`

查询用户资产列表。

#### `POST /api/assets/upload`

上传图片或视频。

#### `POST /api/assets/:id/save-from-node`

将节点输出保存为资产。

### 9.6 分享接口

#### `POST /api/canvases/:id/share`

创建分享链接。

#### `GET /api/shared/:token`

读取分享内容。

---

## 10. 任务系统设计

### 10.1 任务生命周期

任务状态流转：

`pending -> running -> success / failed`

### 10.2 执行逻辑

1. 前端提交生成请求
2. 后端校验节点与参数
3. 创建任务记录
4. 将任务写入队列
5. Worker 消费任务
6. 调用模型 Provider
7. 上传结果到对象存储
8. 写回资产表
9. 更新节点输出
10. 更新任务状态
11. 前端轮询获得结果

### 10.3 Worker 伪代码

```ts
async function handleImageGenerateTask(task: TaskPayload) {
  await markTaskRunning(task.id);

  try {
    const result = await provider.generateImage(task.input);
    const stored = await storage.save(result.file);
    const asset = await assetService.createFromGeneratedFile(stored);
    await nodeService.updateOutput(task.nodeId, {
      assetId: asset.id,
      fileUrl: asset.fileUrl
    });
    await markTaskSuccess(task.id, asset);
  } catch (error) {
    await markTaskFailed(task.id, String(error));
  }
}
```

### 10.4 前端轮询策略

MVP 使用轮询即可：

- 创建任务后每 2 秒轮询一次
- 成功后停止
- 失败后展示错误
- 轮询超时默认 5 分钟

后续可升级为：

- WebSocket
- Server-Sent Events

---

## 11. 节点执行逻辑

### 11.1 文本节点

输入：

- prompt
- style
- maxTokens

输出：

- 文本内容

### 11.2 图片上传节点

输入：

- 本地文件

输出：

- 图片资产 URL
- 缩略图 URL
- 图片元数据

### 11.3 图片生成节点

输入：

- prompt
- 参考文本
- 参考图片
- 比例
- 质量参数

输出：

- 生成图片资产

### 11.4 视频生成节点

输入：

- prompt
- 参考图片
- 时长
- 比例

输出：

- 视频资产

### 11.5 节点依赖校验

示例：

- 图片生成节点允许引用文本节点与图片节点
- 视频生成节点允许引用文本节点与图片节点
- 文本节点不能引用视频节点作为 prompt

建议在后端做统一校验，避免前端绕过规则。

---

## 12. 文件与存储设计

### 12.1 存储分类

- 原始上传文件
- 生成结果文件
- 缩略图
- 预览图

### 12.2 推荐目录结构

```text
/uploads/{userId}/raw/
/uploads/{userId}/generated/images/
/uploads/{userId}/generated/videos/
/uploads/{userId}/thumbnails/
```

### 12.3 资源元数据

建议保存：

- 宽高
- 文件大小
- mime type
- 时长
- 来源任务
- 生成参数快照

---

## 13. 权限与安全

### 13.1 权限规则

- 私有画布仅拥有者可见
- 分享画布按分享 token 可读
- 克隆操作必须登录
- 用户不能修改他人画布

### 13.2 安全要求

- 密码加密存储
- 接口鉴权
- 上传文件类型限制
- 上传大小限制
- 生成接口限流
- 敏感词和非法内容拦截

### 13.3 基础限流建议

- 登录接口：每分钟限制 10 次
- 生成接口：每用户每分钟限制 5 次
- 上传接口：单文件大小限制 50MB

---

## 14. 日志与监控

### 14.1 日志分类

- 认证日志
- 画布保存日志
- 任务执行日志
- 模型调用日志
- 失败日志

### 14.2 必要监控指标

- 任务成功率
- 图片生成平均耗时
- 视频生成平均耗时
- 任务失败率
- 上传失败率
- 画布保存失败率

---

## 15. 测试方案

### 15.1 前端测试

- 节点渲染测试
- 画布保存恢复测试
- 任务状态切换测试
- 分享页只读渲染测试

### 15.2 后端测试

- 认证接口测试
- 画布 CRUD 测试
- 节点依赖校验测试
- 任务状态流转测试
- 分享与克隆测试

### 15.3 集成测试

必须覆盖：

- 登录 -> 新建画布 -> 新建节点 -> 提交任务 -> 查看结果
- 分享 -> 打开分享页 -> 克隆

---

## 16. MVP 开发排期

以下按单个小团队进行估算，默认配置：

- 前端 1 人
- 后端 1 人
- 全栈/负责人 1 人

### 第 1 周：基础工程

- 初始化前端项目
- 初始化后端项目
- 建立数据库与 ORM
- 完成注册登录
- 完成画布列表页

### 第 2 周：画布核心

- 完成画布编辑页布局
- 接入 React Flow
- 完成节点增删改查
- 完成连线和保存

### 第 3 周：生成任务

- 完成图片上传
- 完成文本生成任务
- 完成图片生成任务
- 完成任务轮询

### 第 4 周：视频与分享

- 完成视频生成任务
- 完成分享与克隆
- 完成资产保存
- 完成基础测试和修复

---

## 17. 最小可执行单元清单

以下任务粒度可以直接放进开发管理工具：

### 17.1 账号模块

1. 建立用户表
2. 实现注册接口
3. 实现登录接口
4. 实现前端登录页
5. 实现鉴权中间件

### 17.2 画布模块

1. 建立画布表
2. 实现新建画布接口
3. 实现画布列表接口
4. 实现画布详情接口
5. 实现画布保存接口
6. 搭建画布页面框架
7. 接入画布缩放和平移

### 17.3 节点模块

1. 建立节点表
2. 建立连线表
3. 实现新增节点接口
4. 实现删除节点接口
5. 实现更新节点接口
6. 实现前端节点拖拽
7. 实现前端节点连线
8. 实现节点属性面板

### 17.4 任务模块

1. 建立任务表
2. 建立队列系统
3. 实现创建图片任务接口
4. 实现创建视频任务接口
5. 实现查询任务状态接口
6. 实现 Worker 消费逻辑
7. 实现任务失败重试逻辑

### 17.5 资产模块

1. 建立资产表
2. 实现文件上传接口
3. 实现对象存储写入
4. 实现资产列表接口
5. 实现节点结果保存为资产

### 17.6 分享模块

1. 建立分享表
2. 实现分享链接生成接口
3. 实现分享页读取接口
4. 实现克隆画布接口
5. 实现只读分享页前端

---

## 18. 推荐目录结构

### 18.1 前端目录

```text
src/
  app/
    login/
    canvases/
    canvas/[id]/
    shared/[token]/
  components/
    canvas/
    nodes/
    panels/
    common/
  stores/
  services/
  hooks/
  types/
```

### 18.2 后端目录

```text
src/
  modules/
    auth/
    users/
    canvases/
    nodes/
    tasks/
    assets/
    shares/
  common/
  providers/
  workers/
  prisma/
```

---

## 19. 第二阶段扩展建议

MVP 完成后，可扩展以下能力：

- 图像抠图
- 多图融合
- 图像放大
- 视频分析
- 工作流模板市场
- 社区广场
- 团队协作
- 支付与额度系统
- 操作审计和版本快照

---

## 20. 结论

TapNow 类产品的核心并不是单一模型接入，而是四个系统的组合：

- 画布编排系统
- 多模态任务系统
- 素材与资产系统
- 分享与复刻系统

如果目标是快速做出第一个可演示版本，应该优先保证以下闭环：

- 可创建画布
- 可建立节点关系
- 可提交图片和视频任务
- 可保存结果
- 可分享和克隆

先完成闭环，再逐步增强图像编辑、资产沉淀和社区分发，整体成功率会更高。
