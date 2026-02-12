# 变更文档目录说明

本目录用于存放每一次“新需求/缺陷修复”的独立变更文档包。

## 目录约定

- `INDEX.md`：变更总索引（按时间倒序维护）
- `_TEMPLATE/`：标准模板（复制后使用）
- `<YYYY-MM-DD>-<type>-<slug>/`：一次变更的文档包

## 命名建议

- type: `feature` / `bugfix` / `refactor`
- slug: 英文短语，使用 `-` 分隔

示例：

- `2026-02-12-feature-overlay-filter/`
- `2026-02-13-bugfix-terrain-flicker/`

## 使用流程

1. 复制 `_TEMPLATE` 为新的变更包目录；
2. 按章节填写内容（含 `05-回写主文档清单.md`）；
3. 在 `INDEX.md` 增加一条记录；
4. 合并后将关键结论回写主文档（`doc/01~09`）。
