'use strict';
/**
 * 微软签到巡检（GitHub Actions 版）
 * 读取 run.log，检测异常 → 飞书告警；无异常则每 7 天汇总一次。
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const WEBHOOK = process.env.FEISHU_WEBHOOK || '';
const LOG_PATH = process.env.RUN_LOG || 'run.log';
const STATE_PATH = path.join(__dirname, 'inspect-state.json');
const REPORT_INTERVAL_DAYS = 7;
const COOLDOWN_START = new Date('2026-10-17T00:00:00+08:00');
const COOLDOWN_DAYS = 7;
const MANUAL_REMIND_COOLDOWN_DAYS = 2;
const MANUAL_REMIND_AFTER_DAYS = 7;

function log(msg) {
  console.log(`[inspect] ${msg}`);
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { last_report_date: null, last_manual_remind: null, last_check_date: null };
  }
}

function saveState(s) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
  } catch (e) {
    log(`保存状态失败: ${e.message}`);
  }
}

function today() {
  // 统一按北京时间
  const now = new Date();
  const bj = new Date(now.getTime() + (8 * 60 - (-now.getTimezoneOffset())) * 60000);
  return bj.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function sendFeishu(text, title, color = 'red') {
  if (!WEBHOOK) {
    log('未配置 FEISHU_WEBHOOK，跳过发送');
    return Promise.resolve(false);
  }
  const body = title
    ? {
        msg_type: 'interactive',
        card: {
          header: { title: { tag: 'plain_text', content: title }, template: color },
          elements: [{ tag: 'div', text: { tag: 'lark_md', content: text } }],
        },
      }
    : { msg_type: 'text', content: { text } };

  const data = JSON.stringify(body);
  const url = new URL(WEBHOOK);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 15000,
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          log(`飞书响应: ${buf.slice(0, 120)}`);
          resolve(buf.includes('"code":0'));
        });
      }
    );
    req.on('error', (e) => {
      log(`飞书发送失败: ${e.message}`);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.write(data);
    req.end();
  });
}

function analyzeLog() {
  if (!fs.existsSync(LOG_PATH)) {
    return { problems: ['⚠️ 未找到运行日志（脚本可能未启动）'], summary: null };
  }
  const text = fs.readFileSync(LOG_PATH, 'utf8');
  const problems = [];

  if (/BOT-WARNING|Fraud_UserWarning/.test(text)) problems.push('🚨 微软风控警告（BotScore / Fraud_UserWarning）');
  if (/ACCOUNT-SKIP/.test(text)) problems.push('🚨 账号被跳过（风控触发）');
  if (/status=503/.test(text)) problems.push('⚠️ 微软服务端 503（dashboard 未渲染）');
  if (/\[ERROR\]/.test(text)) {
    const line = text.split('\n').find((l) => l.includes('[ERROR]')) || '';
    problems.push(`⚠️ 运行错误：${line.split('[ERROR]')[1]?.trim().slice(0, 90) || ''}`);
  }
  if (/No accounts found/.test(text)) problems.push('⚠️ 未读取到账号配置（Secrets 可能未设置）');

  // 解析最后一次 RUN-END
  let summary = null;
  const runEnds = text.split('\n').filter((l) => l.includes('[RUN-END]'));
  if (runEnds.length) {
    const last = runEnds[runEnds.length - 1];
    const g = (k) => {
      const m = last.match(new RegExp(`${k}=(\\d+)`));
      return m ? Number(m[1]) : null;
    };
    summary = { gained: g('pointsGained'), prev: g('previousBalance'), current: g('currentBalance') };
    if (summary.gained === 0 && summary.prev > 0 && !problems.length) {
      problems.push(`⚠️ 本次 0 积分（余额 ${summary.current}），可能桌面任务未完成`);
    }
  } else if (!problems.length) {
    problems.push('⚠️ 日志中没有 RUN-END，运行可能异常中断');
  }

  return { problems, summary };
}

async function main() {
  const state = loadState();
  const t = today();
  const { problems, summary } = analyzeLog();

  log(`日期 ${t}，问题数 ${problems.length}`);

  const lines = [];
  if (summary) {
    lines.push(
      `**本次积分**：+${summary.gained ?? '?'} → 余额 ${summary.current ?? '?'}`
    );
  }

  // 1. 有异常：立即告警
  if (problems.length) {
    const key = `${t}|${problems[0].slice(0, 24)}`;
    if (state.last_alert_key !== key) {
      const body = [
        `**巡检时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        '',
        ...lines,
        '',
        ...problems.map((p) => `- ${p}`),
        '',
        '---',
        '**建议**：出现风控警告请立即停止自动化，手动登录 rewards.bing.com 做真实搜索。',
      ].join('\n');
      await sendFeishu(body, '🚨 微软签到异常报警');
      state.last_alert_key = key;
      log('已发送异常告警');
    } else {
      log('今日同问题已告警，跳过');
    }
  } else {
    // 2. 正常：每 7 天汇总
    const needReport =
      !state.last_report_date || daysBetween(state.last_report_date, t) >= REPORT_INTERVAL_DAYS;

    if (needReport) {
      const body = [
        `**巡检时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        '',
        ...lines,
        '',
        '✅ 本次运行正常，无风控警告。',
        '',
        `下次汇总：${REPORT_INTERVAL_DAYS} 天后`,
      ].join('\n');
      await sendFeishu(body, '✅ 微软签到周期报告', 'green');
      state.last_report_date = t;
      log('已发送 7 天汇总');
    } else {
      log(`运行正常，距上次报告 ${daysBetween(state.last_report_date, t)} 天，未到 7 天`);
    }
  }

  // 3. 手动登录提醒
  const cooldownEnd = new Date(COOLDOWN_START.getTime() + COOLDOWN_DAYS * 86400000);
  const inCooldown = new Date(t) <= cooldownEnd;
  const interval = inCooldown ? MANUAL_REMIND_COOLDOWN_DAYS : MANUAL_REMIND_AFTER_DAYS;
  const needRemind =
    !state.last_manual_remind || daysBetween(state.last_manual_remind, t) >= interval;

  if (needRemind) {
    const body = [
      `**当前阶段**：${inCooldown ? '风控冷却期' : '日常维护期'}`,
      `**冷却截止**：${cooldownEnd.toISOString().slice(0, 10)}`,
      '',
      '**请手动登录，各做 5-10 次真实搜索**：',
      '1. `1334221275@qq.com`',
      '2. `zsq1334221275@outlook.com`',
      '3. `2434750576@qq.com`',
      '',
      '- 打开 https://rewards.bing.com 手动登录',
      '- 搜索真实内容，不要重复同一关键词',
      '- 停留几秒再点结果，模拟真人',
      '',
      `下次提醒：${interval} 天后`,
    ].join('\n');
    await sendFeishu(body, '🔔 手动登录提醒', 'orange');
    state.last_manual_remind = t;
  }

  state.last_check_date = t;
  state.last_summary = summary;
  saveState(state);
  log('巡检完成');
}

main().catch((e) => {
  console.error(`[inspect] 失败: ${e.stack || e}`);
  process.exit(1);
});
