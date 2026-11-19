#!/usr/bin/env node
/**
 * tex-review 报告状态工具（只处理 Markdown，不碰 .tex）
 *
 *   node review_report.mjs check <报告.md>
 *   node review_report.mjs list  <报告.md>
 *   node review_report.mjs close <报告.md> <日志.md> <ID> <xg|tg> [--note "…"] [--time "YYYY-MM-DD HH:mm"]
 *
 * 报告格式见 ../templates/review-report.md。字段名（**位置**、**原文**…**RE**）不要改。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CATEGORY_NAME = { T: '文字性', M: '表意', S: '结构', C: 'cite' };
const ITEM_RE = /^###\s+([TMSC])-(\d+)\s*·\s*(高|中|低)(.*)$/;
const FIELD_RE = /^\*{0,2}(位置|原文|问题|建议|修改后|证据|修订|RE|ED|处理备注|批复|结档|备注|报告|备选)\*{0,2}\s*[：:]\s*(.*)$/;
const REQUIRED = ['位置', '原文', '问题', '建议', '修改后'];

const isFence = (line) => /^\s*```/.test(line);
const pad = (n) => String(n).padStart(2, '0');

function stamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseReport(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let fence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isFence(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const match = line.match(ITEM_RE);
    if (!match) continue;

    let end = i + 1;
    let bodyFence = false;
    for (; end < lines.length; end += 1) {
      const l = lines[end];
      if (isFence(l)) {
        bodyFence = !bodyFence;
        continue;
      }
      if (!bodyFence && (/^###\s+/.test(l) || /^##\s+/.test(l) || /^---\s*$/.test(l))) break;
    }

    items.push({
      id: `${match[1]}-${match[2]}`,
      category: match[1],
      severity: match[3],
      heading: line,
      start: i,
      end,
      body: lines.slice(i + 1, end),
      fields: parseFields(lines.slice(i + 1, end)),
    });
    i = end - 1;
  }
  return { lines, items };
}

function parseFields(body) {
  const fields = new Map();
  let current = null;
  let fence = false;
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    if (isFence(line)) {
      fence = !fence;
      if (current) current.lines.push(line);
      continue;
    }
    if (!fence) {
      const match = line.match(FIELD_RE);
      if (match) {
        if (current) current.end = i;
        current = { name: match[1], inline: match[2].trim(), lines: [line], start: i, end: body.length };
        fields.set(match[1], current);
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  for (const field of fields.values()) {
    const content = [field.inline, ...field.lines.slice(1)].join('\n');
    field.value = content
      .split('\n')
      .filter((l) => !isFence(l))
      .join('\n')
      .trim();
  }
  return fields;
}

function counts(items) {
  const out = { T: 0, M: 0, S: 0, C: 0, 高: 0, 中: 0, 低: 0, total: items.length };
  for (const item of items) {
    out[item.category] += 1;
    out[item.severity] += 1;
  }
  return out;
}

function readReport(file) {
  const text = fs.readFileSync(file, 'utf8');
  return { text, ...parseReport(text) };
}

function checkReport(file) {
  const { text, items } = readReport(file);
  const errors = [];
  const warnings = [];
  const idSet = new Set();

  const fenceCount = text.split(/\r?\n/).filter(isFence).length;
  if (fenceCount % 2 !== 0) errors.push('代码围栏（```）未闭合');
  const headingCount = text.split(/\r?\n/).filter((l) => /^###\s+/.test(l)).length;
  if (items.length === 0 && headingCount > 0) {
    errors.push('有 “###” 标题但无法解析；标题应形如 “### T-01 · 高 · 命中 3/3”');
  } else if (items.length === 0) {
    warnings.push('没有待批复条目（若已全部结档属正常）');
  }

  for (const item of items) {
    if (idSet.has(item.id)) errors.push(`${item.id}：ID 重复`);
    idSet.add(item.id);
    for (const key of REQUIRED) {
      const field = item.fields.get(key);
      if (!field) errors.push(`${item.id}：缺少 **${key}**`);
      else if (!field.value) errors.push(`${item.id}：**${key}** 为空`);
    }
    if (!item.fields.has('RE')) errors.push(`${item.id}：缺少 **RE**（批复接口）`);
    const location = item.fields.get('位置');
    if (location && location.value && !/L\d+/.test(location.value)) {
      warnings.push(`${item.id}：**位置** 里没有 “L行号”`);
    }
    if (item.category === 'C' && !item.fields.has('证据')) {
      warnings.push(`${item.id}：cite 条目建议补 **证据**`);
    }
  }

  const c = counts(items);
  const filled = items.filter((i) => i.fields.get('RE')?.value).length;
  return { file: path.resolve(file), counts: c, filled, warnings, errors };
}

function cmdCheck(file) {
  const result = checkReport(file);
  console.log(`报告：${result.file}`);
  console.log(`条目：${result.counts.total}（高 ${result.counts.高} / 中 ${result.counts.中} / 低 ${result.counts.低}）；T ${result.counts.T} · M ${result.counts.M} · S ${result.counts.S} · C ${result.counts.C}`);
  console.log(`RE 已填：${result.filled} / ${result.counts.total}`);
  for (const w of result.warnings) console.log(`警告：${w}`);
  for (const e of result.errors) console.log(`错误：${e}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log('OK');
  return result;
}

function listItems(file) {
  const { items } = readReport(file);
  return items.map((item) => {
    const re = item.fields.get('RE')?.value ? '已填' : '空';
    const location = (item.fields.get('位置')?.value || '').replace(/\s+/g, ' ');
    const problem = (item.fields.get('问题')?.value || '').replace(/\s+/g, ' ').slice(0, 60);
    return `${item.id}\t${item.severity}\tRE:${re}\t${location}\t${problem}`;
  });
}

function cmdList(file) {
  const lines = listItems(file);
  if (!lines.length) {
    console.log('（没有条目）');
    return;
  }
  for (const line of lines) console.log(line);
}

function cleanBlock(lines) {
  const out = [...lines];
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

function collapseBlank(lines) {
  const out = [];
  let fence = false;
  for (const line of lines) {
    if (isFence(line)) {
      fence = !fence;
      out.push(line);
      continue;
    }
    if (!fence && !line.trim() && out.length && !out[out.length - 1].trim()) continue;
    out.push(line);
  }
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

function reportStem(text) {
  for (const line of text.split(/\r?\n/)) {
    if (/^#\s+/.test(line)) {
      return line
        .replace(/^#\s*/, '')
        .replace(/^论文审查报告\s*[·:]\s*/, '')
        .replace(/\.tex\s*$/i, '')
        .trim() || 'paper';
    }
  }
  return 'paper';
}

function logEntry(item, decision, time, note, reportName) {
  const cat = CATEGORY_NAME[item.category];
  const done = decision === 'xg' ? '已修改' : '未修改';
  const heading = `### ${item.id} · ${cat} · ${item.severity} · ${decision} · ${done}`;

  const re = item.fields.get('RE');
  const body = [...item.body];
  if (re) {
    const removeFrom = re.start;
    const removeTo = re.end ?? body.length;
    body.splice(removeFrom, removeTo - removeFrom);
  }
  const kept = cleanBlock(body);

  const tail = ['', `**批复**：${decision}（${decision === 'xg' ? '按当前提案修改' : '不修改，保留原文'}）`];
  if (note) tail.push('', `**备注**：${note}`);
  tail.push('', `**结档**：${time}`, '', `**报告**：\`${reportName}\``);

  return [heading, '', ...kept, ...tail].join('\n');
}

function upsertLog(logText, entry, date, stem) {
  const hasHeader = /^#\s+/m.test(logText);
  let text = hasHeader
    ? logText
    : `# 审查结档日志 · ${stem}.tex\n\n> 记录已批复并结档的条目。条目从审查报告移入，按时间追加；不要删除历史。\n`;

  const lines = text.split(/\r?\n/);
  const dateHeading = `## ${date}`;
  const start = lines.findIndex((l) => l.trim() === dateHeading);
  if (start === -1) {
    const out = [...lines];
    while (out.length && !out[out.length - 1].trim()) out.pop();
    out.push('', dateHeading, '', entry, '');
    return `${out.join('\n')}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const before = lines.slice(0, end);
  while (before.length && !before[before.length - 1].trim()) before.pop();
  const after = lines.slice(end);
  const out = [...before, '', entry, '', ...after];
  return `${collapseBlank(out).join('\n')}\n`;
}

function countClosed(logText) {
  let fence = false;
  let count = 0;
  for (const line of logText.split(/\r?\n/)) {
    if (isFence(line)) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    if (/^###\s+[TMSC]-\d+\s*·/.test(line)) count += 1;
  }
  return count;
}

function updateHeader(lines, items, closed) {
  const c = counts(items);
  const pendingLine = `- 当前待批复：${c.total} 条（高 ${c.高} / 中 ${c.中} / 低 ${c.低}）`;
  const closedLine = `- 已结档：${closed} 条`;
  let pendingAt = lines.findIndex((l) => /^-\s*当前待批复\s*[：:]/.test(l));
  let closedAt = lines.findIndex((l) => /^-\s*已结档\s*[：:]/.test(l));

  if (pendingAt !== -1) lines[pendingAt] = pendingLine;
  if (closedAt !== -1) lines[closedAt] = closedLine;

  if (pendingAt === -1 || closedAt === -1) {
    let insertAt = lines.findIndex((l) => /^##\s+/.test(l));
    if (insertAt === -1) insertAt = lines.length;
    const additions = [];
    if (pendingAt === -1) additions.push(pendingLine);
    if (closedAt === -1) additions.push(closedLine);
    lines.splice(insertAt, 0, ...additions, '');
  }
}

function closeItem(reportFile, logFile, id, decisionArg, flags = {}) {
  const decision = String(decisionArg || '').toLowerCase();
  if (!['xg', 'tg'].includes(decision)) {
    throw new Error(`decision 必须是 xg 或 tg，收到 “${decisionArg}”`);
  }
  const { text, lines, items } = readReport(reportFile);
  const item = items.find((i) => i.id.toLowerCase() === id.toLowerCase());
  if (!item) throw new Error(`报告里找不到条目 ${id}`);

  const time = flags.time || stamp();

  let logText = '';
  if (fs.existsSync(logFile)) logText = fs.readFileSync(logFile, 'utf8');
  const entry = logEntry(item, decision, time, flags.note, path.basename(reportFile));
  logText = upsertLog(logText, entry, time.slice(0, 10), reportStem(text));

  const before = lines.slice(0, item.start);
  while (before.length && !before[before.length - 1].trim()) before.pop();
  const after = lines.slice(item.end);
  let next = collapseBlank([...before, '', ...after]);
  const closed = countClosed(logText);
  const remaining = parseReport(next.join('\n')).items;
  updateHeader(next, remaining, closed);
  next = collapseBlank(next);

  fs.mkdirSync(path.dirname(path.resolve(logFile)), { recursive: true });
  fs.writeFileSync(logFile, logText.endsWith('\n') ? logText : `${logText}\n`, 'utf8');
  fs.writeFileSync(reportFile, `${next.join('\n')}\n`, 'utf8');

  const c = counts(remaining);
  return {
    closed: item.id,
    decision,
    time,
    remaining: c.total,
    severity: { 高: c.高, 中: c.中, 低: c.低 },
    report: path.resolve(reportFile),
    log: path.resolve(logFile),
  };
}

function cmdClose(reportFile, logFile, id, decisionArg, flags) {
  const result = closeItem(reportFile, logFile, id, decisionArg, flags);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function usage() {
  console.log('用法：');
  console.log('  node review_report.mjs check <报告.md>');
  console.log('  node review_report.mjs list  <报告.md>');
  console.log('  node review_report.mjs close <报告.md> <日志.md> <ID> <xg|tg> [--note "…"] [--time "YYYY-MM-DD HH:mm"]');
}

function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const rest = argv.slice(1);
  if (!command || ['-h', '--help', 'help'].includes(command)) {
    usage();
    return;
  }

  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--note') flags.note = rest[(i += 1)] || '';
    else if (arg === '--time') flags.time = rest[(i += 1)] || '';
    else positional.push(arg);
  }

  try {
    if (command === 'check') {
      if (!positional[0]) throw new Error('缺少报告路径');
      cmdCheck(positional[0]);
    } else if (command === 'list') {
      if (!positional[0]) throw new Error('缺少报告路径');
      cmdList(positional[0]);
    } else if (command === 'close') {
      if (positional.length < 4) throw new Error('close 需要：报告 日志 ID xg|tg');
      cmdClose(positional[0], positional[1], positional[2], positional[3], flags);
    } else {
      throw new Error(`未知命令：${command}`);
    }
  } catch (error) {
    console.error(`错误：${error.message}`);
    process.exit(2);
  }
}

export { parseReport, checkReport, listItems, closeItem };

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (invokedDirectly) main();
