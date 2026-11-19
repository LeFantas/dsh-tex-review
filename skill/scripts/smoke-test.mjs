#!/usr/bin/env node
/**
 * review_report.mjs 的确定性冒烟测试。
 *
 *   node scripts/smoke-test.mjs
 *
 * 覆盖：check / list / close；xg / tg；RE-ED 多轮；plain RE；表头统计；页脚；
 * 非法 ID。不需要模型，不调用 tex-review 的审查流程。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkReport, listItems, closeItem } from './review_report.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tex-review-smoke-'));
const reportPath = path.join(tempRoot, 'report.md');
const logPath = path.join(tempRoot, 'log.md');

const reportLines = [
  '# 论文审查报告 · smoke.tex',
  '',
  '- 当前待批复：2 条（高 1 / 中 1 / 低 0）',
  '- 已结档：0 条',
  '',
  '## 文字性审查',
  '',
  '### T-01 · 高 · 命中 2/2',
  '',
  '**位置**：`smoke.tex` L1',
  '',
  '**原文**：',
  '',
  '```latex',
  'a',
  '```',
  '',
  '**问题**：测试用。',
  '',
  '**建议**：改成 b。',
  '',
  '**修改后**：',
  '',
  '```latex',
  'b2',
  '```',
  '',
  '**RE**：第一轮：b 可以吗？',
  '',
  '**ED**：可以，最新建议是 b2：',
  '',
  '```latex',
  'b2',
  '```',
  '',
  '**RE**：',
  '',
  '## cite审查',
  '',
  '### C-01 · 中 · 命中 1/2（单次）',
  '',
  '**位置**：`smoke.tex` L2',
  '',
  '**原文**：',
  '',
  '```latex',
  'c',
  '```',
  '',
  '**问题**：测试用。',
  '',
  '**建议**：改成 d。',
  '',
  '**修改后**：',
  '',
  '```latex',
  'd',
  '```',
  '',
  'RE：xg',
  '',
  '---',
  '',
  '批复方法：测试用。',
  '',
];

fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

let passed = 0;
function check(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
  console.log(`PASS ${message}`);
}

function readReport() {
  return fs.readFileSync(reportPath, 'utf8');
}

function readLog() {
  return fs.readFileSync(logPath, 'utf8');
}

try {
  const initial = checkReport(reportPath);
  check(initial.errors.length === 0, 'check 初始报告没有错误');
  check(initial.counts.total === 2, 'check 识别出 2 条');
  check(initial.filled === 1, 'check 只把最后一个 RE 计入已填');

  const listed = listItems(reportPath);
  check(listed.length === 2 && listed.some((line) => line.startsWith('T-01')) && listed.some((line) => line.startsWith('C-01')), 'list 列出两条');

  const xg = closeItem(reportPath, logPath, 'T-01', 'xg', { time: '2026-11-18 20:40' });
  check(xg.closed === 'T-01' && xg.remaining === 1, 'close xg 返回正确的剩余数');
  const afterXg = readReport();
  check(!afterXg.includes('### T-01'), 'close xg 从报告移除 T-01');
  check(afterXg.includes('- 当前待批复：1 条（高 0 / 中 1 / 低 0）'), 'close xg 更新待批复统计');
  check(afterXg.includes('- 已结档：1 条'), 'close xg 更新已结档统计');
  const logAfterXg = readLog();
  check(logAfterXg.includes('### T-01 · 文字性 · 高 · xg · 已修改'), '日志写入 T-01 结档标题');
  check(logAfterXg.includes('**RE**：第一轮：b 可以吗？'), '日志保留第一轮 RE');
  check(logAfterXg.includes('**ED**：可以，最新建议是 b2：'), '日志保留 ED 回复');
  check(logAfterXg.includes('**批复**：xg（按当前提案修改）'), '日志写入 xg 批复');

  const tg = closeItem(reportPath, logPath, 'C-01', 'tg', { time: '2026-11-18 20:41' });
  check(tg.closed === 'C-01' && tg.remaining === 0, 'close tg 返回正确的剩余数');
  const afterTg = readReport();
  check(!afterTg.includes('### C-01'), 'close tg 从报告移除 C-01');
  check(afterTg.includes('- 当前待批复：0 条（高 0 / 中 0 / 低 0）'), 'close tg 后待批复为 0');
  check(afterTg.includes('- 已结档：2 条'), 'close tg 后已结档为 2');
  check(afterTg.includes('批复方法：测试用。'), 'close 保留报告页脚');
  const logAfterTg = readLog();
  check(logAfterTg.includes('### C-01 · cite · 中 · tg · 未修改'), '日志写入 C-01 tg 标题');
  check(logAfterTg.includes('**批复**：tg（不修改，保留原文）'), '日志写入 tg 批复');
  check(!logAfterTg.includes('RE：xg'), '日志不复刻已被移除的 plain RE');

  const empty = checkReport(reportPath);
  check(empty.counts.total === 0, '全部结档后条目数为 0');
  check(empty.warnings.some((warning) => warning.includes('没有待批复条目')), '全部结档后 check 给出提示');

  let bad = null;
  try {
    closeItem(reportPath, logPath, 'Z-99', 'xg');
  } catch (error) {
    bad = error;
  }
  check(bad !== null && /找不到条目/.test(bad.message), '不存在的 ID 抛出“找不到条目”');

  console.log(`\nsmoke test passed: ${passed} checks`);
  fs.rmSync(tempRoot, { recursive: true, force: true });
} catch (error) {
  console.error(`\nFAIL: ${error.message}`);
  console.error(`临时目录保留用于排查：${tempRoot}`);
  process.exitCode = 1;
}
