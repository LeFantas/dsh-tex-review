# tex-review

审查 LaTeX 论文（`.tex`）的 skill：按 `n` 次独立审查汇总成带行号、原文、修改建议和 `RE：` 的审查单；再按 `xg` / `tg` / `RE-ED` 循环改稿并结档。

## 快速开始

```text
/tex-review paper.tex n=3 s=all
/tex-review paper.tex n=2 s=T,S
/tex-review paper.tex n=2 s=M
/tex-review paper.tex s=M            # 不写 n → n=1
/tex-review reviews/paper-review-20261118-2016.md
```

- `n` 不写时默认 `1`（单次审查）；建议 `3`（更稳但更慢）。
- `s=` 是审查类型（scope）：`T`=文字性，`M`=表意，`S`=结构，`C`=cite。
- 组合：`s=T,M` 或连写 `s=TM`；`s=all` / `s=全` = 四项全做；也接受中文全名（`s=文字,结构`）。
- 不写 `s=` 时默认全审，并在报告头部注明。

## 审查维度

| 简称 | 维度 | 查什么 |
| --- | --- | --- |
| T | 文字性 | 语法、拼写、冠词、从句、标点 |
| M | 表意 | 通顺、歧义、指代、逻辑连接 |
| S | 结构 | 缩写/符号首次且仅首次定义、`\ref` / `\label` 完整性 |
| C | cite | `\citet` / `\citep` 语义、bib key 与条目正确性（可联网核验） |

报告里的条目 ID 也用这套简称：`T-01`、`M-02`、`S-03`、`C-04`。

## 批复循环

审查单里每条都有 `RE：`。你写意见，代理用 `ED：` 回复并给新建议，再留一个空 `RE：`：

````markdown
**RE**：用 `the method` 是不是更自然？

**ED**：可以，但 L9 还没点名具体方法；最新建议如下：

```latex
This is important because the method controls the error rate.
```

**RE**：
````

- `RE：xg`：按顶部最新的 `修改后` 落盘，移入日志结档。
- `RE：tg`：不修改，直接移入日志结档。
- ED 阶段只改提案，不动 tex/bib；循环到 xg/tg 为止。
- 日志保留完整的 RE/ED 讨论。

## 产物

在论文同目录的 `reviews/` 下：

- `reviews/<stem>-review-<时间>.md`：审查单（待批条目）
- `reviews/<stem>-review-log.md`：结档日志（含讨论历史）
- `reviews/.runs/<时间>/pass-k.json`：每遍审查的原始 JSON
- `reviews/backups/`：改稿前备份

## 文件

- [SKILL.md](SKILL.md)：完整协议与字段格式
- [templates/review-report.md](templates/review-report.md)：报告骨架
- [templates/review-log.md](templates/review-log.md)：日志骨架
- [templates/reviewer-prompt.md](templates/reviewer-prompt.md)：子代理提示词
- [scripts/review_report.mjs](scripts/review_report.mjs)：`check` / `list` / `close`
- [scripts/smoke-test.mjs](scripts/smoke-test.mjs)：23 项确定性自检

## 边界

- 只改条目覆盖的文本，不改无关句子、不重排格式。
- 不替作者改观点、数据、结论。
- `tg` 绝不改；`xg` 只按当前提案改；ED 不落盘。
- cite 核验不到就写“未核验”，不编造。
