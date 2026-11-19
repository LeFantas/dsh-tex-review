# 论文审查报告 · {{STEM}}.tex

- 论文：`{{TEX_PATH}}`（共 {{LINE_COUNT}} 行）
- 生成：{{DATETIME}}
- 独立审查：n={{N}}（{{PARALLEL_OR_SERIAL}}）
- 维度：{{DIMENSIONS}}{{DEFAULT_NOTE}}
- 行号基准：生成时版本；应用修改后行号会偏移，批复时以**原文**定位为准。
- 当前待批复：{{COUNT}} 条（高 {{HIGH}} / 中 {{MID}} / 低 {{LOW}}）
- 已结档：{{CLOSED}} 条

## 汇总（生成时）

| 类别 | 高 | 中 | 低 | 合计 |
| --- | --- | --- | --- | --- |
| 文字性 | {{T_HIGH}} | {{T_MID}} | {{T_LOW}} | {{T_TOTAL}} |
| 表意 | {{M_HIGH}} | {{M_MID}} | {{M_LOW}} | {{M_TOTAL}} |
| 结构 | {{S_HIGH}} | {{S_MID}} | {{S_LOW}} | {{S_TOTAL}} |
| cite | {{C_HIGH}} | {{C_MID}} | {{C_LOW}} | {{C_TOTAL}} |
| **合计** | {{HIGH}} | {{MID}} | {{LOW}} | {{COUNT}} |

优先处理（当前）：

1. `{{TOP_ID_1}}` {{TOP_LOCATION_1}}：{{TOP_REASON_1}}
2. `{{TOP_ID_2}}` {{TOP_LOCATION_2}}：{{TOP_REASON_2}}
3. `{{TOP_ID_3}}` {{TOP_LOCATION_3}}：{{TOP_REASON_3}}

## 文字性审查

{{T_ITEMS}}

## 表意审查

{{M_ITEMS}}

## 结构审查

{{S_ITEMS}}

## cite审查

{{C_ITEMS}}

---

批复方法：在每条 `RE：` 后填写 `xg`（按当前提案修改）、`tg`（不修改），或直接写你的修改意见；代理会在 `ED：` 下回复并留一个新的 `RE：`。已结档条目会移入 `{{LOG_NAME}}`。
