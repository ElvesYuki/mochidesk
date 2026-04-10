# Codex 状态来源与桌宠行为规划

## 背景

MochiDesk 当前已经具备以下基础：

- 真实 CPU / 内存监控链路
- `src/lib/services/codex-monitor.ts` 的前端状态 service 骨架
- `src-tauri/src/monitor/` 中的 Codex 原生占位接口
- `motion.ts` 中可承接 Codex 语义状态的动作入口

下一阶段的目标，不是把更多监听逻辑直接塞进页面，而是继续把“Codex 运行状态 -> 语义状态 -> 小木藕行为”这条链路稳定下来，并为后续更多玩法保留扩展空间。

本文档分为两层：

- 当前建议落地的来源与聚合方案
- 后续可以逐步推进的功能规划池

## 当前实现边界

### 当前已实现

- `src/lib/models/codex-status.ts`
  已定义 `CodexActivity` 与 `CodexStatusSnapshot`
- `src/lib/services/codex-monitor.ts`
  已提供前端轮询与模拟回退能力
- `src-tauri/src/monitor/mod.rs`
  已提供 `CodexMonitorState` 占位结构
- `src-tauri/src/commands/mod.rs`
  已暴露 `get_codex_status_snapshot`
- `src/lib/animation/motion.ts`
  已能接收 `codexActivity`

### 当前未实现

- 真实 Codex 状态采集
- 多来源聚合
- 持久化会话识别
- 终端焦点跳转
- 权限审批、通知气泡等桌宠外部交互

## 目标原则

- 优先保留清晰边界，不让页面组件直接依赖原生监听细节
- 优先形成语义状态层，而不是把底层事件直接映射到动画
- 优先做“稳定可观察”的状态，再逐步加复杂玩法
- 优先支持本地桌面 MVP，再考虑远程、托管、多 Agent 共存

## 状态来源设计

后续建议把 Codex 状态来源按三类组织，而不是一开始只绑定一种实现。

### 1. Local Auto

本地自动发现模式，优先作为第一条真实接入链路。

候选来源：

- `~/.codex/sessions/` 下的会话日志或 JSONL 产物
- Codex 运行期间产生的状态文件
- 本地可稳定识别的会话缓存目录

适合原因：

- 不需要用户额外配置
- 最符合当前 MVP 的轻量目标
- 能较快验证“小木藕跟随 Codex 状态变化”的核心体验

风险：

- 会话格式可能变化
- 日志监听可能存在延迟
- 难以只靠文件内容准确识别“当前主会话”

### 2. Local Bridge

本地桥接模式，由 MochiDesk 或外部辅助脚本主动提供状态。

候选来源：

- 本地 sidecar 进程
- 本地 HTTP / WebSocket bridge
- Codex hook 或脚本将状态推送给桌宠

适合原因：

- 语义更清晰
- 延迟更低
- 更适合扩展权限审批、通知、任务完成等事件

风险：

- 引入额外运行单元
- 需要安装或配置
- 当前阶段略重，不建议先做成默认主链路

### 3. External Source

连接外部已存在的状态源，例如远程开发机场景或未来多端联动。

候选来源：

- 外部 app-server
- 远程 WebSocket
- SSH 转发回来的本地端口

适合原因：

- 便于后续远程开发场景
- 可复用统一语义层

风险：

- 当前桌面 MVP 阶段价值不如本地直连高
- 需要先稳定本地模型

## 推荐实施顺序

1. 先做 `Local Auto`
2. 再做 `Local Bridge`
3. 最后视真实需求决定是否支持 `External Source`

## 语义状态层设计

不建议让前端动画直接消费底层事件名、日志字段或原生命令输出。建议先聚合到统一语义状态。

### 建议的第一版状态

- `idle`
  没有检测到活跃 Codex 行为
- `thinking`
  正在推理、组织回答、尚未进入执行
- `acting`
  正在调用工具、运行命令、读写文件
- `waiting_input`
  正在等待用户确认、输入或决策
- `error`
  最近一次关键动作失败或中断
- `done`
  一次任务刚完成，适合短暂庆祝后回落

### 第二版可扩展状态

- `multi_tasking`
  多线程或多 worktree 并行工作
- `subagent_one`
  单子代理活跃
- `subagent_many`
  多子代理并行
- `approval`
  请求权限审批
- `compacting`
  正在整理上下文或压缩历史
- `sleeping`
  长时间没有 Codex 活动

## 聚合模型建议

后续建议把桌宠最终表现收口为一个更高层的聚合模型，而不是让多个系统独立改动画。

建议结构：

```ts
interface DesktopPetState {
  systemLoad: {
    cpuLoad: number | null;
    memoryLoad: number | null;
    energy: number;
  };
  codex: {
    activity: CodexActivity;
    detail: string | null;
    source: "placeholder" | "simulated" | "native";
  };
  interaction: {
    dragging: boolean;
    hovering: boolean;
    interacting: boolean;
  };
  display: {
    mood: "idle" | "calm" | "alert" | "busy";
    emphasis: "ambient" | "codex" | "interaction";
  };
}
```

作用：

- `systemLoad` 负责热态、节奏、浮动和长期压力
- `codex` 负责语义行为和角色意图
- `interaction` 负责用户点击、悬停、拖拽
- `display` 负责最终谁拥有表现优先级

## 表现优先级建议

为了避免后面状态互相打架，建议提前定义优先级。

建议优先级：

1. 用户直接交互
2. Codex 明确事件
3. 系统负载氛围
4. 空闲待机

示例：

- 正在拖拽时，不应被 Codex 的 `thinking` 抢走动作主导权
- `error` 和 `waiting_input` 应短暂压过普通 `calm / alert`
- 没有 Codex 活动时，系统 CPU / 内存继续决定轻载、警觉、红温氛围

## 建议的动作映射

### 第一阶段

- `idle`
  轻呼吸、轻漂浮、偶尔眨眼
- `thinking`
  更专注、轻微前倾、视线更稳定
- `acting`
  手部更忙、节奏更快、身体更紧一点
- `waiting_input`
  短暂停住，轻轻抬头或看向用户
- `error`
  短促僵住、冒汗、轻微泄气
- `done`
  很轻的放松或开心回弹

### 第二阶段

- `subagent_one`
  单侧手忙、视线偏移，像在分心处理一件额外任务
- `subagent_many`
  更明显的高频忙碌动作，甚至短促“指挥感”
- `approval`
  更明确地提醒用户注意，但不一定做完整卡片
- `compacting`
  收拢、整理、扫尾感的动作

## 真实监听的候选落地路径

### 路径 A：日志 / 会话文件轮询

实现方向：

- Rust 侧在 `src-tauri/src/monitor/` 轮询本地会话目录
- 解析增量内容
- 提炼为统一 `CodexStatusSnapshot`

优点：

- 最适合当前 MVP
- 不需要额外服务
- 用户成本低

缺点：

- 时效性略差
- 对本地文件结构依赖更强

### 路径 B：本地桥接服务

实现方向：

- 增加本地 bridge 进程或脚本
- 将 Codex 状态主动推送给 Tauri

优点：

- 延迟更低
- 后续权限审批、通知事件更容易扩展

缺点：

- 架构更重
- 当前阶段实现成本更高

### 路径 C：外部状态源接入

实现方向：

- 连接用户提供的本地或远程地址
- 统一转换成 `CodexStatusSnapshot`

优点：

- 扩展性最好

缺点：

- 不适合作为当前主线

## 功能规划池

以下内容不是当前已实现，而是后续可以逐步推进的功能池。目的是保留思路，不在迭代中丢失。

### P1：近期高价值

- Codex 真实状态接入
- `CodexStatus -> 小木藕动作` 的第一版完整映射
- 调试面板显示当前 `cpu / memory / energy / codexActivity`
- `done` 状态的短促庆祝反馈
- `waiting_input` 状态的抬头等待动作
- `error` 状态的轻微冒汗 / 泄气动作

### P2：中期增强

- 多会话识别与优先级选择
- 长时间无活动后的睡觉链路
- 更明确的“正在编辑 / 正在执行命令 / 正在读取”细分状态
- 状态切换历史与最近事件缓存
- 任务完成后的轻量提示泡泡
- 红温状态和 Codex 忙碌状态叠加时的更自然融合逻辑

### P3：后续可探索

- 子代理感知
- 多 worktree / 多线程并行感知
- 审批请求提醒
- 外部桥接模式
- 远程 SSH / 远程开发机状态映射
- 终端焦点跳转
- 托盘模式下的状态切换
- 极简模式或边缘潜伏模式
- 可切换皮肤、主题和角色变体
- 道具系统，例如电脑、扳手、小旗子、扫帚

### P4：表达层玩法

- 基于不同状态的短句气泡
- 任务完成时的轻提示文本
- 鼠标靠近时的注视 / 打招呼差异
- 更细的手部表演模型
- 不同负载与 Codex 状态组合下的多层表情
- 状态驱动的小循环，例如烦躁、打字、整理、发呆

## 文档与实现同步建议

后续每次推进这条链路时，建议同时更新：

- `README.md`
  说明当前支持的状态来源与限制
- `docs/memory/index.md`
  同步当前实现状态
- `docs/memory/待办.md`
  同步近期 Todo / Done
- 必要时在 `docs/memory/决策/` 中记录
  当前真实监听是走日志、桥接还是外部源

## 当前推荐的下一步

最顺的下一步不是继续扩充动画数量，而是先把真实来源跑通并验证边界。

建议顺序：

1. 选择第一条真实来源链路，优先评估 `Local Auto`
2. 定义第一版事件到语义状态的映射规则
3. 给 `thinking / acting / waiting_input / error / done` 做第一版动作差异
4. 补一个轻量调试视图，便于观察真实状态切换

只有在这条最小链路稳定后，再继续做多会话、审批、远程接入、极简模式等扩展能力。
