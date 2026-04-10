# MochiDesk

MochiDesk 是一个基于 `Tauri 2 + SvelteKit + Svelte 5 + TypeScript + Rust` 的桌面灵动组件项目。它以“小木藕”作为核心形象，通过 SVG 动画与系统状态联动，目标是在桌面上提供一个轻量、常驻、具有陪伴感的动态 Widget。

## 项目定位

MochiDesk 当前优先解决的是“桌面端的实时陪伴式状态反馈”，而不是通用管理界面或重交互业务系统。

当前产品方向更接近“桌面宠物 / 灵动组件”，重点是：

- 轻量常驻
- 强视觉识别
- 高频动画反馈
- 低资源占用
- 为未来扩展预留清晰的模型和能力边界

## 当前阶段

当前仓库处于 Desktop MVP 阶段，目标是先做出一个真实可运行、可观察、可继续迭代的桌面宠物壳。

### 当前已实现

- `Tauri 2 + SvelteKit + Svelte 5 + TypeScript + Rust` 项目骨架
- 小尺寸、无边框、透明背景、置顶显示的桌面窗口
- 基础拖拽、位置恢复、边缘吸附和屏幕可见区域修正
- Tauri runtime 下的真实 CPU / 内存快照轮询，Web 预览环境保留模拟状态流
- `CodexStatus` 状态骨架与 `codex-monitor` service，已预留后续接入真实 Codex 运行状态的边界
- Tauri runtime 下已接入第一版 `Local Auto` Codex 状态读取，会扫描本机 `~/.codex/sessions/**/*.jsonl` 中最近活跃的 rollout 文件
- 小木藕像素风 SVG 形象与基础动效表现
- Rust 侧 `commands`、`window`、`monitor` 模块和统一注册入口

### 当前重点

- 真实监控链路的平滑策略、刷新频率与稳定性
- 逐步把 Codex 运行状态监听接入 `src-tauri/src/monitor/`，再通过 `src/lib/services/codex-monitor.ts` 提供前端语义状态
- 更清晰的系统状态模型和动画映射抽象
- 前端页面职责继续拆分，避免入口文件长期承载过多逻辑
- 透明窗口、置顶、拖拽吸附等平台相关能力的持续验证

## Codex 本地自动发现

当前 Tauri runtime 下，MochiDesk 已实现第一版 `Local Auto` Codex 状态读取：

- 扫描本机 `~/.codex/sessions/` 下最近活跃的 `rollout-*.jsonl`
- 读取最近一段事件窗口
- 先映射为较稳的几档语义状态：
  - `idle`
  - `thinking`
  - `acting`
  - `waiting_input`
  - `notice`
  - `celebrate`
  - `error`
  - `error_burst`
  - `done`

当前这版规则偏保守，目标是先稳定而不是一次性做全：

- 检测到 `reasoning` 或最近用户消息时，倾向 `thinking`
- 检测到工具调用时，倾向 `acting`
- 检测到 `task_complete` 或 `final_answer` 时，先短暂视为 `done`，随后回落为 `waiting_input`
- 检测到工具输出里的明确失败信号时，映射为 `error`
- 最近一段时间没有新事件时，回到 `idle`

当前这些 Codex 语义状态也已经开始影响小木藕的动作表现：

- `thinking`
  会更专注一点，视线和身体更收，思考气泡与表情也会带一点轻微聚焦节奏
- `acting`
  手部会出现更明显的左右错峰敲击节奏，整体节奏更急一点
- `waiting_input`
  会更明显地抬头停住、看向你，像在等你下一句
- `notice`
  会更像“突然收到提醒 / 需要你注意”，带一点惊讶上抬
- `celebrate`
  会更像“顺利收尾”，比普通 `done` 更开心、更跳一点
- `error`
  会先短暂绷住，再带一点泄气下坠
- `error_burst`
  会更像“刚炸了一下”，比普通 `error` 更急、更明显
- `done`
  会有一个短促亮起和松劲回弹，再自然回落

当前已知限制：

- 当前只取最近活跃 rollout 文件，尚未做多会话聚合
- 状态识别基于本地 session 文件结构，后续需要继续验证兼容性
- `waiting_input` 当前主要代表“完成后等待下一句”，还未覆盖更细的审批 / 确认场景

### 非当前优先级

以下方向可以保留为未来可能性，但不作为当前阶段的默认工作：

- monorepo 拆分，例如 `apps/desktop`
- Web 端演示版和移动端壳
- `Tailwind CSS`、图标体系、共享包等扩展型基础设施
- 复杂状态机、托盘系统、点击穿透切换等更重的桌宠能力

## MVP 定义

当前最推荐的 MVP 不是多端一起推进，而是先完成这 4 件事：

1. 一个透明或拟透明的桌面窗口，并支持置顶显示
2. 一个可识别的小木藕基础形象
3. 一个桌面端可用的系统监控数据接口，先接 CPU / 内存
4. 一套最小动效映射规则，让系统负载直接影响视觉表现

这个版本完成后，项目才真正具备“从想法进入产品原型”的基础。

## 桌面宠物 V1 方向

当前桌面端优先从“桌面宠物”而不是“信息面板”推进。V1 的目标不是一次性做成完整桌宠系统，而是先做出一个真正像宠物的桌面角色壳。

### V1 包含范围

- 透明、无边框、置顶的小尺寸窗口
- 以小木藕本体为主的宠物界面，而不是大块信息面板
- 可拖拽移动
- 待机呼吸、轻微漂浮、基础表情切换
- 用系统状态流驱动宠物情绪和动作强度
- Tauri runtime 使用真实 CPU / 内存快照，前端单独预览保留模拟回退

### V1 暂不包含

- 真正的桌面层驻留效果
- 系统托盘与显示 / 隐藏菜单
- 点击穿透切换
- 随机走动、碰撞、复杂状态机
- 完整多端统一架构

## 当前状态切换规则

当前实现里，桌宠的状态由 `src/lib/animation/motion.ts` 根据 CPU / 内存快照映射为 `idle / calm / alert / busy` 四档。

### 输入规则

- 当 `cpuLoad === null && memoryLoad === null` 时，直接进入 `idle`
- 只要有有效监控值，就会继续计算综合能量 `energy`
- CPU 是主导项，内存是辅助项，但高内存会额外推高压力感

当前实现使用的综合能量公式为：

```ts
const cpuEnergy = cpuLoad ?? memoryLoad ?? 0;
const memoryEnergy = memoryLoad ?? cpuLoad ?? 0;
const baseEnergy = cpuEnergy * 0.7 + memoryEnergy * 0.3;
const pressureBoost = Math.max(0, memoryEnergy - 0.72) * 0.22;
const energy = Math.min(1, baseEnergy + pressureBoost);
```

这意味着：

- CPU 占比更高，主要决定动作节奏和紧张感
- 内存主要负责“持续压力”修正
- 当内存超过 `0.72` 后，会额外增加一些热态倾向

### 状态阈值

- `idle`
  条件：`cpuLoad === null && memoryLoad === null`
- `busy`
  条件：满足任一项
  - `energy >= 0.72`
  - `cpuLoad >= 0.78`
  - `memoryLoad >= 0.88`
- `alert`
  条件：未进入 `busy`，但满足任一项
  - `energy >= 0.4`
  - `cpuLoad >= 0.48`
  - `memoryLoad >= 0.58`
- `calm`
  条件：有有效监控值，但未达到 `alert` 或 `busy`

可以把它理解为：

- `idle`：没有监控数据
- `calm`：低负载，正常待机
- `alert`：中等负载，开始警觉
- `busy`：高负载或高内存压力，进入红温

### 平滑与降抖

真实监控链路不会直接使用原始快照，而是先经过一层平滑处理，再参与状态切换：

- 上升更快，下降更慢
- 小幅波动会被死区忽略
- 内存平滑也会比 CPU 更稳一点

这样做的目的，是避免 CPU 瞬时尖峰让桌宠情绪来回抖动。

## 调试状态循环模式

当前前端内置了两组本地调试循环开关，分别用于观察系统负载链路和 Codex 语义状态链路。

### 系统状态循环

触发方式：

- `Shift + 双击桌宠` 开启
- 再次 `Shift + 双击桌宠` 关闭

开启后会按以下顺序自动轮播，每档大约持续 `5` 秒：

1. `idle`
2. `calm`
3. `alert`
4. `busy`

开启时，桌宠右上角会出现一个轻量角标，例如：

- `idle loop`
- `calm loop`
- `alert loop`
- `busy loop`

### Codex 状态循环

触发方式：

- `Alt + 双击桌宠` 开启
- 再次 `Alt + 双击桌宠` 关闭

开启后会按以下顺序自动轮播，每档大约持续 `5` 秒：

1. `idle`
2. `thinking`
3. `acting`
4. `waiting_input`
5. `notice`
6. `celebrate`
7. `error`
8. `error_burst`
9. `done`

开启时，调试角标和开发态信息面板都会同步显示当前 Codex 状态，方便直接观察动作差异。

这两组模式都只用于本地观察状态表现，不会修改底层真实监控逻辑。

当前比较适合重点观察的差异是：

- `thinking`
  更像“专注想事”，视线略收、身体略提
- `acting`
  更像“正在敲代码或跑工具”，左右手节奏不完全同步，会显得更忙
- `waiting_input`
  更像“停下来等你回应”，身体会更定住一点，头脸更上抬
- `notice`
  更像“有通知 / 需要确认”，会明显上提并出现提醒标记
- `celebrate`
  更像“顺利结束后开心一下”，会更轻快地跳一下
- `error`
  更像“出岔子了”，会有更明显的下坠和紧张感
- `error_burst`
  更像“刚刚报错炸了一下”，会更短更猛地绷住再掉一点
- `done`
  更像“刚做完”，会先短暂松一口气，再回到等待态

当前原生侧对 `notice / celebrate / error_burst` 的识别还是第一版保守关键词匹配，后续建议继续拿真实 rollout 样本校准。

## 开发原则

- 优先做桌面端 MVP，再决定何时扩展 Web 端与移动端
- 优先定义数据模型和动画模型，再扩展多端 UI 壳
- 优先抽象接口边界，再引入跨平台实现
- 优先轻量和流畅，再增加装饰性能力
- 文档中明确区分“当前已实现”和“未来规划”
- 优先删除无用代码、模板内容和历史兼容壳，保持仓库干净

## 推荐目录结构

当前阶段建议继续按“单仓桌面端可扩展结构”组织：

```text
/
├── src/
│   ├── lib/
│   │   ├── components/        # 通用 Svelte 组件
│   │   ├── features/          # 特性级界面和交互
│   │   ├── models/            # 前端数据模型与类型
│   │   ├── services/          # 原生调用封装、监控数据适配
│   │   ├── animation/         # 动画参数与状态映射
│   │   └── utils/             # 工具函数
│   ├── routes/
│   └── app.html
├── src-tauri/
│   ├── src/
│   │   ├── commands/          # Tauri 命令
│   │   ├── monitor/           # 系统监控实现
│   │   ├── window/            # 窗口能力封装
│   │   └── lib.rs             # 注册入口
│   └── tauri.conf.json
├── static/
├── docs/
│   ├── memory/                # 项目长期记忆
│   └── plans/                 # 正式计划文档
└── temp/                      # 视觉草图与实验稿，非正式产品代码
```

这个结构的重点不是“预埋很多未来架构”，而是先把当前桌面端边界收清楚：

- 页面和特性组件不要长期堆在入口文件
- 原生调用优先经过 `src/lib/services/`
- 动画映射优先收口到 `src/lib/animation/`
- Tauri 命令统一在 `src-tauri/src/lib.rs` 注册

如果未来真的出现明确的共享需求，再考虑演进到 `apps/desktop` 或 `packages/*` 结构。

## 项目协作与记忆

仓库现在使用 `docs/memory/` 维护跨会话协作记忆。

开始任务前，优先阅读：

- `docs/memory/index.md`：项目定位、阶段目标、硬约束、当前风险
- `docs/memory/待办.md`：当前 Backlog / Todo / Doing / Done

按需补充：

- `docs/memory/决策/`：已经形成明确结论的技术决策
- `docs/memory/方案/`：尚未完全落地的设计草案
- `docs/memory/会话纪要/`：阶段性结果和后续建议
- `docs/plans/`：正式计划文档和里程碑拆解

详细协作规则见 `AGENTS.md`。

## 工程风险与注意事项

- 透明窗口、置顶、点击穿透等能力在不同平台上的行为差异较大，需要分别验证
- 系统监控刷新频率不能过高，否则会抵消“轻量”目标
- SVG 动画要尽量建立稳定的状态输入和表现映射，避免视觉逻辑散落在多个层级
- 当前首页入口承担的职责仍然偏多，后续需要继续拆分
- `temp/` 目录中的 HTML 草稿和视觉实验稿不应直接视为正式实现

## 启动项目

### 1. 前置环境

开始之前，建议先确认本机已经安装以下环境：

- Node.js 18+ 与 `pnpm`
- Rust 工具链
- Windows 下的 Microsoft C++ Build Tools
- Windows 下的 WebView2 Runtime

如果是第一次配置 Tauri 开发环境，可以参考官方文档：

- Tauri prerequisites: <https://v2.tauri.app/start/prerequisites/>
- Tauri + SvelteKit: <https://v2.tauri.app/start/frontend/sveltekit/>

### 2. 安装依赖

在项目根目录执行：

```bash
pnpm install
```

### 3. 启动桌面开发模式

最常用的启动方式是：

```bash
pnpm tauri dev
```

当前项目的 Tauri 配置中已经包含：

- `beforeDevCommand = "pnpm dev"`
- `devUrl = "http://localhost:1420"`

执行 `pnpm tauri dev` 时，Tauri 会自动先拉起前端开发服务器，再打开桌面窗口。

当前默认窗口表现包括：

- 小尺寸窗口
- 无边框
- 透明背景
- 置顶显示
- 可拖拽移动
- 记住上次停留位置
- 分辨率或屏幕变化后自动拉回可见区域
- 靠近屏幕边缘时自动吸附

### 4. 只启动前端页面

如果只想单独查看前端页面，不打开 Tauri 桌面壳，可以执行：

```bash
pnpm dev
```

启动后访问：

```text
http://localhost:1420
```

### 5. 类型检查

```bash
pnpm check
```

### 6. Rust 侧检查

```bash
cd src-tauri
cargo check
```

### 7. 生产构建

如果要验证前端静态构建，可以执行：

```bash
pnpm build
```

如果后续要构建桌面安装包，再执行：

```bash
pnpm tauri build
```

## 常用命令

```bash
pnpm install
pnpm dev
pnpm check
pnpm tauri dev
pnpm build
pnpm tauri build
```

## 当前仓库结构

```text
src/         SvelteKit 前端代码
src-tauri/   Tauri 与 Rust 代码
static/      静态资源
docs/memory/ 项目长期记忆
temp/        视觉草图与实验稿
```
