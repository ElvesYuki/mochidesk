# MochiDesk 项目记忆索引

## 项目定位

MochiDesk 是一个基于 `Tauri 2 + SvelteKit 2 + Svelte 5 + TypeScript + Rust` 的桌面应用项目，当前聚焦桌面宠物 / 灵动组件方向的 MVP。

产品核心不是通用管理后台，也不是企业 CRUD 系统，而是围绕“小木藕”形象构建一个轻量、常驻、具有陪伴感的桌面组件。

## 当前技术栈

- 前端：`SvelteKit`、`Svelte 5`、`TypeScript`、`Vite`
- 桌面壳：`Tauri 2`
- 原生侧：`Rust`
- 包管理：`pnpm`

## 当前仓库结构

```text
src/         SvelteKit 前端代码
src-tauri/   Tauri 与 Rust 代码
static/      静态资源
docs/memory/ 项目长期记忆
```

当前目录边界建议：

- `src/lib/features/` 放特性级组件与交互
- `src/lib/components/` 放通用组件
- `src/lib/services/` 放原生调用封装、系统数据适配
- `src/lib/animation/` 放动画参数与状态映射
- `src/lib/models/` 放前端数据模型与类型
- `src-tauri/src/commands/` 放 Tauri 命令
- `src-tauri/src/window/` 放窗口能力封装
- `src-tauri/src/monitor/` 放监控能力或占位实现

## 当前阶段

当前项目处于 Desktop MVP 阶段，重点是做出一个真实可运行、可观察、可继续迭代的桌面宠物壳。

已具备的基础：

- `Tauri 2 + SvelteKit + TypeScript + Rust` 骨架
- 小尺寸透明、无边框、置顶、跳过任务栏的桌宠窗口
- 基础拖拽、实时位置保存、位置恢复、边缘吸附和离屏修正逻辑
- 前端模拟的系统状态流
- 小木藕像素风 SVG 形象、头顶连续旋转豆芽和红温态基础动效

尚未稳定落地的方向：

- 真实系统监控能力
- 更清晰的系统状态模型与动画映射抽象
- 更细的前端结构拆分
- 平台差异能力的系统验证

## 当前产品偏好

当前已明确的产品与视觉偏好：

- 以桌面宠物为主，不做仪表盘、卡片面板或滚动信息框
- 窗口尺寸尽量维持桌面图标级别，并尽量贴近角色轮廓
- 主体保持像素风，小木藕头顶使用对称叶片 / 豆芽做持续旋转
- 红温或高负载状态需要明显更忙、更热，允许出现蒸汽、融化感和更快旋转
- 角色需要保留可见的小手，后续预留电脑操作、点按和持物动作扩展空间

## 当前阶段目标

桌面 MVP 的核心目标：

1. 一个透明或拟透明的桌面窗口，并支持置顶显示
2. 一个可识别的小木藕基础形象
3. 一个桌面端可用的系统监控数据接口，先接 CPU / 内存
4. 一套最小动效映射规则，让系统负载直接影响视觉表现

## 硬约束

- 不要把其他项目里的 Python、Vue、FastAPI、Pinia、SQLAlchemy 等规范迁入本仓库
- 优先保持项目干净和可扩展，及时删除模板、演示代码和无用桥接逻辑
- 新增 Tauri 命令时，在 `src-tauri/src/lib.rs` 中集中注册
- 当前阶段优先服务桌面端 MVP，不提前引入 monorepo、移动端壳、复杂插件体系
- 文档必须区分“当前已实现”和“未来规划”

## 当前已知实现状态

- 前端首页入口当前直接挂载 `HomePage.svelte`
- `HomePage.svelte` 当前主要负责页面装配、拖拽中的 UI 状态和模拟监控流接入
- `src/lib/services/pet-window.ts` 已承担窗口拖拽、位置持久化、离屏修正、多显示器恢复和边缘吸附
- `MochiAvatar.svelte` 已实现像素风 SVG 主体、连续旋转豆芽、红温蒸汽 / 融化态、更大的表情和可见豆豆手
- 手部当前已有轻微待机摆动与高光，后续可继续扩展为点按、持物等动作
- `system-monitor.ts` 当前仍是占位 / 模拟实现，尚未接真实系统监控；每段模拟状态持续时间已拉长
- Rust 侧已存在 `commands`、`window`、`monitor` 模块和统一 `lib.rs` 注册入口
- `src-tauri/tauri.conf.json` 当前桌宠窗口尺寸为 `90 x 108`

## 当前核心文件地图

- `src/routes/+page.svelte`
  当前前端页面入口，负责挂载 `HomePage.svelte`
- `src/lib/features/home/HomePage.svelte`
  当前桌宠页面装配入口，负责拖拽中的 UI 状态、模拟监控流接入和头像挂载
- `src/lib/features/mochi-avatar/MochiAvatar.svelte`
  当前小木藕主视觉组件，包含像素主体、豆芽旋转、红温态、表情、手部和局部动画
- `src/lib/services/system-monitor.ts`
  当前系统状态占位 / 模拟实现；后续接真实 CPU / 内存监控时优先从这里切入
- `src/lib/animation/motion.ts`
  当前系统状态到动作参数的映射入口，负责把监控快照转换为 `MotionProfile`
- `src/lib/services/pet-window.ts`
  当前桌宠窗口行为封装，负责拖拽、位置保存、恢复、离屏修正、多显示器恢复和吸附
- `src-tauri/src/lib.rs`
  当前 Tauri Rust 侧统一注册入口；新增命令时优先检查这里
- `src-tauri/src/commands/`
  Tauri 命令目录；当前原生命令入口预留位置
- `src-tauri/src/window/`
  窗口能力相关 Rust 模块目录；后续如需把更多窗口能力下沉到原生侧，可从这里演进
- `src-tauri/src/monitor/`
  监控能力相关 Rust 模块目录；真实系统监控后续大概率会从这里展开
- `src-tauri/tauri.conf.json`
  当前桌宠窗口尺寸、透明、置顶、是否跳过任务栏等窗口配置入口

## 当前风险

- `MochiAvatar.svelte` 已积累较多造型、状态和动画细节，后续需要评估拆分，避免单文件继续膨胀
- 模拟监控、动画映射、窗口行为之间的边界还不够稳定
- 透明窗口、置顶、拖拽吸附等能力存在平台差异，需要持续验证
- 临时视觉稿和正式代码并存时，容易让文档与实际落地状态混淆

## 协作约定

- 每次开始任务前先读本文件和 `待办.md`
- 涉及方案演进或重要取舍时，在 `决策/` 或 `方案/` 记录
- 会话结束前同步 `待办.md`，必要时追加 `会话纪要/`
- 发现过时文档、旧规范或无用资源时主动清理
