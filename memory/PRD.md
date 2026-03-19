# GlowCare - AI 心理健康支持 App PRD

## 产品概述
GlowCare 是一款面向中文用户的 AI 心理健康支持移动应用，提供情绪追踪、对话分析、危机支持和情绪报告功能。

## 技术架构
- **前端**: Expo SDK 54 + React Native + Expo Router（文件路由）
- **后端**: FastAPI + MongoDB
- **AI 模型**: 豆包（Doubao, 主力）/ gpt-4o-mini（备用回退）via Emergent LLM Key
- **状态管理**: React useState/useContext
- **导航**: Expo Router (文件路由)

## 核心功能 & 实现状态

### ✅ 已完成

| 功能 | 文件 | 状态 |
|------|------|------|
| 主页导航 + Tab 栏 | app/index.tsx | ✅ 测试通过 |
| 情绪追踪页 | app/emotions.tsx | ✅ 实现（录音功能受 iPad 设备限制） |
| 对话分析页 | app/conversations.tsx | ✅ 测试通过 |
| 危机支持页 | app/support.tsx | ✅ 实现 |
| 情绪报告页 | app/reports.tsx | ✅ 实现 |
| STT 语音转文字（OpenAI Whisper）| backend/server.py, conversations.tsx, emotions.tsx | ✅ 测试通过 (2026-03-19) |
| 个人设置页 | app/profile/settings.tsx | ✅ 测试通过 (2026-03-19) |
| 历史页筛选/排序 | app/conversations/history.tsx | ✅ 测试通过 (2026-03-19) |
| iPad 录音增强修复 | app/conversations.tsx, app/emotions.tsx | ✅ 代码已优化（待设备验证） |
| 后端 AI 分析（豆包） | backend/server.py | ✅ 运行中（回退至 gpt-4o-mini） |
| 历史 API | backend/server.py | ✅ 测试通过 |

### 🔴 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| iPad 录音失败 | 暂缓 | RecordingDisabledException，用户设备不在手边 |
| 豆包模型名称无效 | 待修复 | doubao-1.5-pro 模型名被 Emergent LLM Key 拒绝，自动回退至 gpt-4o-mini |
| STT 语音转文字 | MOCKED | 返回硬编码示例文本 |

## 数据库 Schema
- `users`: {id, name, email, created_at, settings}
- `emotions`: {id, user_id, emotion, intensity, context, text_input, ai_analysis, triggers, timestamp, source}
- `conversations`: {id, user_id, conversation_text, analysis, support_suggestions, crisis_level, timestamp}

## API 端点
- `POST /api/users` — 创建用户
- `GET /api/users/{id}` — 获取用户
- `POST /api/emotions` — 记录情绪（AI 分析）
- `GET /api/emotions/{user_id}` — 获取情绪历史
- `POST /api/conversations/analyze` — 对话分析（AI）
- `GET /api/conversations/{user_id}/history` — 对话历史（分页）
- `GET /api/conversations/detail/{id}` — 对话详情
- `POST /api/support/crisis` — 危机支持
- `GET /api/reports/{user_id}/mood` — 情绪报告

## 优先级路线图

### P0（当前）
- [x] 对话历史功能

### P1（下一步）
- [ ] 修复豆包模型名称（需获取 Emergent LLM Key 支持的正确模型名）
- [ ] 个人设置页（AI 模型选择、风险阈值、语言）

### P2
- [ ] 每日情绪签到提醒（expo-notifications）
- [ ] 修复 iPad 录音问题（RecordingDisabledException）

### 未来
- [ ] 社区内容增强（帖子详情、评论、举报）
- [ ] 真实 STT 服务集成（火山引擎 / Google Speech）
- [ ] 后端 Pydantic schema 验证 + QoS 监控
