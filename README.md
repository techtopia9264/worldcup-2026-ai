# 2026 世界杯 · AI 预言

6 个 AI 模型，104 场比赛，每天预测、点评、竞赛。谁是最懂球的 AI？

🔗 https://aijing-sai-yu-ce-shi-jie-bei.onrender.com

---

## 每日流程

```bash
cd worldcup

# 1. 同步最新比分（CDN + 手动补）
npm run sync
npm run result <matchId> <homeScore> <awayScore> <winner>

# 2. 生成 Prompt → 发给 AI → 粘贴回复
npm run prompts
# → 打开 deepseek-prompt.md 等 6 个文件，复制发给对应 AI
# → AI 返回 JSON → 粘贴到 predictions/YYYY-MM-DD/{ai}.json

# 3. 提交 → Render 自动部署
git add -A && git commit -m "update: $(date +%Y-%m-%d) 数据更新" && git push
```

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 构建 |
| `npm run sync` | 从 OpenFootball CDN 同步真实比分 |
| `npm run result <id> <h> <a> <w>` | 手动添加比赛结果 |
| `npm run prompts` | 生成 6 个 AI 的 Prompt + JSON 模板 |

## 数据

```
predictions/
├── initial/          # 赛前原始预测（不可变）
├── prompt.md         # AI 提示词模板
├── 2026-06-14/       # 每日预测 + 评论
└── 2026-06-15/
```

## 部署

Render 自动部署：推送 `main` 分支即上线。
