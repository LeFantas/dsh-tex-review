# dsh-tex-review 维护笔记

**面向作者本人**的维护信息，不随插件分发给使用者。使用者文档见 `README.md`。

## 目录

- 真源：`my_tools/skills/tex-review`（正文、模板、脚本、smoke 示例都在这里改）
- 发行包：`my_tools/plugins/dsh-tex-review`（`skill/` 是快照，不含 `examples/`）
- profile 安装副本：`~/.dsh/profiles/desktop/.local-plugins/dsh-tex-review`
- 冒烟审查产物：`skills/tex-review/examples/smoke/reviews/`，原始 JSON 在 `.runs/<时间>/`

## 改完 skill 后同步

```powershell
Copy-Item -Recurse -Force skills\tex-review\* plugins\dsh-tex-review\skill\
Remove-Item -Recurse -Force plugins\dsh-tex-review\skill\examples
Copy-Item -Recurse -Force plugins\dsh-tex-review\lib,plugins\dsh-tex-review\skill,plugins\dsh-tex-review\cordis.patch.yml,plugins\dsh-tex-review\package.json,plugins\dsh-tex-review\README.md `
  "$env:USERPROFILE\.dsh\profiles\desktop\.local-plugins\dsh-tex-review"
```

同步后重启 DSH（或重载插件）。只改 `skill/` 里的文件不会刷新已注册的正文。

## 校验

```bash
diff -rq skills/tex-review plugins/dsh-tex-review/skill    # 只应剩 examples
node --check plugins/dsh-tex-review/lib/index.js
node skills/tex-review/scripts/smoke-test.mjs               # review_report 的 23 项自检
node skills/tex-review/scripts/review_report.mjs check <报告.md>
```

## 安装/卸载注意

- `plugin_manager` 的 `install_bundle` 在**运行中的 Host** 里可能返回 `application: failed` + `next is not a function`；最小 no-op 插件也会复现，说明是 Host 热启用路径问题，不是插件逻辑。包与 profile 配置已写好，重启 DSH 即生效。
- `remove_bundle` 在插件处于应用失败状态时可能同样报错；先 `set_bundle enabled=false` 再 `remove_bundle`。
- 开发期可用 `TEX_REVIEW_SKILL_DIR` 指向真源，免去复制。
