#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
# ## user_problem_statement: {problem_statement}
# ## backend:
# ##   - task: "Task name"
# ##     implemented: true
# ##     working: true  # or false or "NA"
# ##     file: "file_path.py"
# ##     stuck_count: 0
# ##     priority: "high"  # or "medium" or "low"
# ##     needs_retesting: false
# ##     status_history:
# ##         -working: true  # or false or "NA"
# ##         -agent: "main"  # or "testing" or "user"
# ##         -comment: "Detailed comment about status"
# ##
# ## frontend:
# ##   - task: "Task name"
# ##     implemented: true
# ##     working: true  # or false or "NA"
# ##     file: "file_path.js"
# ##     stuck_count: 0
# ##     priority: "high"  # or "medium" or "low"
# ##     needs_retesting: false
# ##     status_history:
# ##         -working: true  # or false or "NA"
# ##         -agent: "main"  # or "testing" or "user"
# ##         -comment: "Detailed comment about status"
# ##
# ## metadata:
# ##   created_by: "main_agent"
# ##   version: "1.0"
# ##   test_sequence: 0
# ##   run_ui: false
# ##
# ## test_plan:
# ##   current_focus:
# ##     - "Task name 1"
# ##     - "Task name 2"
# ##   stuck_tasks:
# ##     - "Task name with persistent issues"
# ##   test_all: false
# ##   test_priority: "high_first"  # or "sequential" or "stuck_first"
# ##
# ## agent_communication:
# ##     -agent: "main"  # or "testing" or "user"
# ##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build GlowCare - AI mental health support app with emotion tracking, conversation analysis, crisis support, and mood reports"

backend:
  - task: "Core API setup with emotion tracking endpoints"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented comprehensive backend with emotion tracking, AI analysis, crisis support, and mood reports using Emergent LLM integration"
      - working: true
        agent: "testing"
        comment: "✅ BACKEND TESTING COMPLETED SUCCESSFULLY! All 6 core API test categories passed (11 individual tests). Backend is production-ready."

  - task: "AI emotion analysis integration"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Integrated emergentintegrations library with GPT-4o-mini for emotion analysis and crisis support"
      - working: false
        agent: "user"
        comment: "用户反馈：对话分析效果很差，不如千问/豆包基础模型"
      - working: "NA"
        agent: "main"
        comment: "升级至 Doubao（通过 Emergent LLM Key，提供者可回退），重写提示词并统一 JSON 输出：emotion_primary、valence、arousal、risk_score、triggers、distortions、actions、summary。为长文本加入处理提示。"

  - task: "Conversation analysis endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "合并 AI 分析与危机支持，支持动作建议去重合并；危机等级保留。"

frontend:
  - task: "Mobile app foundation with navigation"
    implemented: true
    working: true
    file: "frontend/app/index.tsx"  
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created GlowCare mobile app with tab navigation, feature cards, and placeholder screens for core functionality"
      - working: true
        agent: "testing"
        comment: "✅ COMPREHENSIVE MOBILE TESTING COMPLETED SUCCESSFULLY! All core functionality verified on mobile dimensions"

  - task: "Phase 2: Emotion tracking screens with speech-to-text"
    implemented: true
    working: "NA"
    file: "frontend/app/emotions.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented comprehensive emotion tracking screen with text input, voice recording, mood slider, and API integration"

  - task: "Phase 2: Conversation analysis screen"
    implemented: true
    working: "NA"
    file: "frontend/app/conversations.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created conversation analysis screen with speech-to-text, AI analysis, crisis level detection, and support suggestions"

  - task: "Phase 2: Crisis support screen"
    implemented: true
    working: "NA"
    file: "frontend/app/support.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Built crisis support screen with breathing exercise animation, CBT techniques, emergency resources, and context-aware support"

  - task: "Phase 2: Mood reports with calendar heatmap"
    implemented: true
    working: "NA"
    file: "frontend/app/reports.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created mood reports screen with calendar heatmap visualization, emotion breakdown charts, AI insights, and weekly/monthly report generation"

metadata:
  created_by: "main_agent"
  version: "2.1"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "AI emotion analysis integration"
    - "Conversation analysis endpoint"  
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "已将后端 LLM 切换为 Doubao（Emergent Key），并提供 OpenAI 自动回退；重写提示词并统一 JSON 输出结构。请先进行后端深度测试，重点验证 /api/emotions 与 /api/conversations/analyze 的 JSON 字段与稳定性。"