# dsh-tex-review

给 DeepSeek Harness（DSH）用的论文审查插件：把 `tex-review` skill 注册进 Harness，让**同一 profile 下的所有项目和会话**都能用 `/tex-review` 审查 LaTeX 论文，不依赖某个项目目录。

版本：1.0.0

## 它做什么

`tex-review` 是一个论文审查与改稿闭环：

- **审查**：指定论文和参数，做 n 次独立审查并合并成审查单（Markdown），每条给出位置、原文、问题、建议、修改后文本，以及一个 `RE：` 批复位。
- **批复**：在 `RE：` 后写 `xg`（按建议改）/ `tg`（不改）或修改意见，代理用 `ED：` 回复并留新的 `RE：`；`xg` / `tg` 后条目移入结档日志。

审查维度：

| 简称 | 维度 | 查什么 |
| --- | --- | --- |
| T | 文字性 | 语法、拼写、冠词、从句、标点 |
| M | 表意 | 通顺、歧义、指代、逻辑连接 |
| S | 结构 | 缩写/符号首次且仅首次定义、`\ref` / `\label` 完整性 |
| C | cite | `\citet` / `\citep` 用法、bib key 与条目正确性（可联网核验） |

## 使用

```text
/tex-review paper.tex n=3 s=all
/tex-review paper.tex n=3 s=T,S
/tex-review paper.tex s=M            # 不写 n → n=1
/tex-review reviews/paper-review-20260801-1012.md    # 处理 RE 批复
```

- `n`：独立审查次数，默认 1，建议 3。
- `s=`：审查类型，`T` / `M` / `S` / `C`，可组合（`s=TM`）；`all` 或 `全` 为四项全做。
- 产物写在论文同目录的 `reviews/`：审查单、结档日志、改稿前备份、每遍原始 JSON。

## 安装

需要 DSH 的 profile 机制（`dsh` 0.2.x 或更高）。

1. 在 DSH 会话里用插件管理器安装，`target` 指向本目录：

   ```text
   plugin_manager action=install_bundle target="<本目录的绝对路径>"
   ```

   返回 `application: applied` 即安装并启用。

2. 安装会把本包链接进当前 profile 的 `dsh.profile.bundles`，重启 DSH 后仍在。

3. 如果返回 `application: failed` 且诊断为 `next is not a function`，这是运行中 Host 的热启用路径问题（与插件逻辑无关）；重启 DSH 即可，启动时 profile 会重新加载 bundle。

4. 验证：新建一个不在本包目录下的项目，开新会话输入 `/tex-review`，或让模型列出 skill 目录。

## 卸载

```text
plugin_manager action=remove_bundle target="dsh-tex-review"
```

## 组成

```text
dsh-tex-review/
├─ package.json        # dsh.bundle.patch 指向 patch
├─ cordis.patch.yml    # 往 Loader 树插入一行插件
├─ lib/index.js        # apply 时读 skill/SKILL.md 并注册到 ctx.skills
└─ skill/              # tex-review 本体：SKILL.md、templates/、scripts/
```

`lib/index.js` 在插件加载时读取 `skill/SKILL.md`，拆分 frontmatter 与正文，把 `resourceBase` 指向 `skill/` 目录，然后调用 `ctx.skills.register`。SKILL.md 里引用的 `templates/`、`scripts/` 相对路径都落在 `skill/` 下。

## 依赖

- DSH，且启用了 `skills` 服务（默认启用）。
- 运行 `skill/scripts/*.mjs` 需要 Node.js 18+（仅在调用脚本时需要）。

## 常见问题

**装了但看不到 `/tex-review`？**
- 确认当前项目里没有同名 skill 覆盖它：项目级 `.dsh/skills/tex-review` 优先级更高。
- 确认已重启 DSH（启动期加载的 bundle 才稳定生效）。

**改 skill 内容要重启吗？**
插件的 skill 正文在加载时读取一次；改 `skill/` 后需要重载插件或重启 DSH。

**审查会联网吗？**
只有 cite 维度会按需联网核验文献条目；核验不到会在条目里写“未核验”，不会编造。
