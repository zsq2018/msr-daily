# MSR Daily

Microsoft Rewards 自动签到（GitHub Actions 版）。

## 说明

- 每天 UTC 14:05（北京时间 22:05）自动运行
- 登录会话通过 Actions Cache 持久化
- 运行结果自动巡检，异常时通过飞书告警；正常则每 7 天汇总一次
- 账号密码存放在 GitHub Secrets，不写入代码

## 需要的 Secrets

| 名称 | 说明 |
|------|------|
| `ACCOUNT_1_EMAIL` | 账号邮箱 |
| `ACCOUNT_1_PASSWORD` | 账号密码 |
| `FEISHU_WEBHOOK` | 飞书机器人 Webhook 地址 |

添加多个账号时，依次增加 `ACCOUNT_2_EMAIL` / `ACCOUNT_2_PASSWORD` …

## 手动触发

Actions → Microsoft Rewards Daily → Run workflow。

## 配置

`config.json` 控制要执行的任务（搜索、打卡、阅读等）。
