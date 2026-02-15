# ADR: Globe 与 Mercator 投影分离（Projection Segregation）

> 状态：已批准  
> 日期：2026-02-15  
> 关联变更包：`doc/changes/2026-02-12-refactor-segregate-globe-mercator/`

## 1. 背景与动机

当前 `projection: 'globe'` 的实现并非纯 Globe 渲染，而是一个 Globe ↔ Mercator 混合模式：

- **工厂层**（`projection_factory.ts:40-56`）：`'globe'` 分支注入了 `['interpolate', ['linear'], ['zoom'], 11, 'vertical-perspective', 12, 'mercator']`，按缩放级别在 VerticalPerspective 和 Mercator 之间线性插值。
- **Projection 层**（`globe_projection.ts:44-61`）：`transitionState` 是 0~1 连续值，`useGlobeRendering = transitionState > 0`，`currentProjection` 按此切换。
- **Transform 层**（`globe_transform.ts:252-254`）：内部持有 `_mercatorTransform` + `_verticalPerspectiveTransform`，通过 `_globeness` 做插值和路由。
- **Camera 层**（`globe_camera_helper.ts:27-31`）：`currentHelper` 按 `useGlobeControls` 在两套 CameraHelper 间切换。
- **渲染循环**（`map.ts:3546-3610`）：每帧读 `transitionState`，跨阈值时触发 `_updateSources` 和 `_updatePlacement`。

这带来三个问题：

1. **语义不一致**：业务设置 `'globe'`，但内核可能走 Mercator 链路；
2. **行为不可预测**：缩放穿越 z11-z12 时渲染、交互、事件出现跳变；
3. **扩展受阻**：Globe 专项能力需要兼容混合态，维护成本高。

## 2. 决策

引入 **Strict Projection Mode**（严格投影模式），与现有行为（称为 **Legacy-Hybrid**）通过内部运行时开关并存。

```ts
type ProjectionSegregationMode = 'legacy-hybrid' | 'strict';
```

默认策略：短期 `legacy-hybrid`，灰度稳定后切到 `strict`。

## 3. Strict 与 Legacy-Hybrid 行为矩阵

### 3.1 投影工厂 (`projection_factory.ts`)

| 维度 | Legacy-Hybrid（当前） | Strict（目标） |
| --- | --- | --- |
| `'globe'` 创建 | `GlobeProjection` + zoom 11→12 插值 | 纯 `VerticalPerspectiveProjection` + `VerticalPerspectiveTransform` + `VerticalPerspectiveCameraHelper` |
| `'mercator'` 创建 | 纯 `MercatorProjection` 三件套 | 不变 |
| `'vertical-perspective'` 创建 | 纯 `VerticalPerspectiveProjection` 三件套 | 不变 |
| 返回类型 | `GlobeProjection`（混合外壳） | `GlobeProjection`（固定 VP，不注入插值表达式） |

### 3.2 运行时投影状态

| 维度 | Legacy-Hybrid | Strict |
| --- | --- | --- |
| `transitionState` | 0~1 连续值，按缩放插值 | 固定 1（globe）或 0（mercator），无中间态 |
| `useGlobeRendering` | 随缩放动态变化 | 恒为 `true`（globe）或 N/A（mercator） |
| `_globeness` | 0~1 连续值 | 固定 1 或不使用 GlobeTransform |
| `currentTransform` | 每帧可能切换 | 始终指向单一 Transform，无切换 |
| `currentProjection` | 每帧可能切换 | 始终指向单一 Projection，无切换 |
| `currentHelper` | 每帧可能切换 | 始终指向单一 CameraHelper，无切换 |

### 3.3 渲染循环 (`map.ts`)

| 维度 | Legacy-Hybrid | Strict |
| --- | --- | --- |
| `globeRenderingChanged` | 每帧可为 true（跨阈值时） | 永远为 false（无阈值切换） |
| `setTransitionState` 调用 | 每帧传递连续值 | 不再调用（无过渡状态），或固定传递 1/0 |
| `_updateSources` 额外触发 | 缩放跨阈值时触发 | 不会因投影过渡触发 |
| `_updatePlacement` | 收到 `globeRenderingChanged=true` | 不会因投影过渡触发 |

### 3.4 事件语义 (`events.ts`)

| 维度 | Legacy-Hybrid | Strict |
| --- | --- | --- |
| `projectiontransition` 触发时机 | `setProjection` 显式调用 + 内部过渡跳变 | **仅** `setProjection` 显式调用时触发 |
| 事件注释 | "globe 可能内部切到 mercator" | "globe 即纯 globe，mercator 即纯 mercator" |

### 3.5 插值与过渡行为

| 维度 | Legacy-Hybrid | Strict |
| --- | --- | --- |
| `getPixelScale()` | `lerp(mercator, VP, globeness)` | 直接返回 VP 值（globe）或 Mercator 值 |
| `getCircleRadiusCorrection()` | `lerp(mercator, VP, globeness)` | 直接返回单一链路值 |
| `getPitchedTextCorrection()` | `lerp(mercator, VP, globeness)` | 直接返回单一链路值 |
| `getProjectionData()` | 计算两套 ProjectionData，按 globeness 选择/混合 | 仅计算单一链路 ProjectionData |
| `_calcMatrices()` | 双向同步 Z 值 | 仅单一 Transform 计算矩阵 |

## 4. 接口影响

### 不变

- `map.getProjection()` / `map.setProjection()` 签名不变
- `style.getProjection()` / `style.setProjection()` 签名不变
- `ProjectionSpecification` 类型不变
- `'globe'`、`'mercator'`、`'vertical-perspective'` 枚举值不变

### 语义收敛

- `projection: 'globe'` → 运行时链路恒为 VerticalPerspective（strict 下）
- `projection: 'mercator'` → 运行时链路恒为 Mercator
- `projectiontransition` 事件仅由显式 `setProjection` 调用触发

### 新增（内部）

```ts
interface ProjectionRuntimeState {
  configuredProjection: 'mercator' | 'globe';
  activeProjection: 'mercator' | 'globe';
  segregationMode: 'legacy-hybrid' | 'strict';
}
```

在 `strict` 模式下恒满足：`activeProjection === configuredProjection`。

## 5. 实施策略

### Phase 1: 工厂分支（T-02）

在 `projection_factory.ts` 中，当 `segregationMode === 'strict'` 时：
- `'globe'` 仍使用 `GlobeProjection` + `GlobeTransform` + `GlobeCameraHelper` 三件套（保持 `projection.name === 'globe'` 的 API 兼容性）
- 但传入 `{type: 'vertical-perspective'}` 而非 zoom 插值表达式
- 结合 T-03/T-04 的 strict 保护，确保运行时不发生内部切换

### Phase 2: Globe* 组件冻结（T-03, T-04）

- `GlobeProjection`: strict 模式下 `transitionState` 固定为 1，`useGlobeRendering` 恒为 true
- `GlobeTransform`: strict 模式下 `_globeness` 固定为 1，`setTransitionState` 为空操作
- `GlobeCameraHelper`: strict 模式下 `useGlobeControls` 恒为 true

### Phase 3: 渲染循环无需特殊处理（T-05）

- `map.ts`: 渲染循环无需 strict 特判。由于 Globe* 组件在 strict 下 transitionState 恒为 1、_globeness 恒为 1，`globeRenderingChanged` 自然始终为 false
- `setErrorQueryLatitudeDegrees` 和 `setTransitionState` 正常调用（对 strict 下的 Globe* 组件无副作用）

### Phase 4: 灰度开关（T-06）

- 运行时配置控制 `segregationMode`
- 默认 `'legacy-hybrid'`，通过配置切到 `'strict'`

## 6. 回滚方案

- 切换 `segregationMode` 为 `'legacy-hybrid'` 即回滚到旧行为
- 保留 `Globe*` 组件和 legacy 代码路径至少一个发布周期
- 若配置回滚无效，执行版本回滚

## 7. 验收标准

- [ ] strict 模式下 `activeProjection === configuredProjection` 恒成立
- [ ] strict 模式下无 `globeRenderingChanged` 触发
- [ ] strict 模式下 `projectiontransition` 仅在 `setProjection` 调用时触发
- [ ] strict 模式渲染主循环 P95 不高于基线 +3%
- [ ] legacy-hybrid 模式行为与重构前完全一致
