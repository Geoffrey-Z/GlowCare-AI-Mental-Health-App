from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Initialize LLM Chat
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Preferred providers/models (do not require .env changes; can be overridden if present)
PREFERRED_PROVIDER = os.environ.get('LLM_PROVIDER', 'doubao')
PREFERRED_MODEL = os.environ.get('LLM_MODEL', 'doubao-1.5-pro')
ALT_PROVIDER = os.environ.get('LLM_PROVIDER_ALT', 'volcano')
ALT_MODEL = os.environ.get('LLM_MODEL_ALT', 'doubao-1.5-pro-32k')
FALLBACK_PROVIDER = os.environ.get('LLM_PROVIDER_FALLBACK', 'openai')
FALLBACK_MODEL = os.environ.get('LLM_MODEL_FALLBACK', 'gpt-4o-mini')

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: Dict[str, Any] = Field(default_factory=dict)

class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None

class EmotionEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    emotion: str  # primary emotion detected
    intensity: float  # 0.0 to 10.0 scale
    context: Optional[str] = None  # user provided context
    text_input: Optional[str] = None  # what user typed/said
    ai_analysis: Optional[str] = None  # AI's analysis
    triggers: List[str] = Field(default_factory=list)  # identified triggers
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str = "manual"  # manual, voice, conversation

class EmotionCreate(BaseModel):
    user_id: str
    text_input: str
    context: Optional[str] = None
    source: str = "manual"

class ConversationEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    conversation_text: str
    analysis: Dict[str, Any]  # emotion analysis, mood insights
    support_suggestions: List[str]  # AI generated suggestions
    crisis_level: int = 0  # 0-5 scale, 0=normal, 5=emergency
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ConversationCreate(BaseModel):
    user_id: str
    conversation_text: str

class SupportRequest(BaseModel):
    user_id: str
    request_type: str  # "breathing", "cbt", "crisis", "general"
    context: Optional[str] = None

class MoodReport(BaseModel):
    user_id: str
    period: str  # "week", "month"
    emotions_summary: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Helper Functions
async def _safe_llm_call(system_message: str, prompt: str) -> Dict[str, Any]:
    """Try preferred Doubao provider first, then alternate, then fallback to OpenAI."""
    if not EMERGENT_LLM_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY is not set")

    session_id = str(uuid.uuid4())
    providers = [
        (PREFERRED_PROVIDER, PREFERRED_MODEL),
        (ALT_PROVIDER, ALT_MODEL),
        (FALLBACK_PROVIDER, FALLBACK_MODEL),
    ]

    last_error = None
    for provider, model in providers:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_message,
            )
            # Try to configure model
            try:
                chat.with_model(provider, model)
            except Exception as e:
                # Some implementations only error on send; still proceed to send
                logging.warning(f"LLM with_model warning for {provider}/{model}: {e}")

            user_message = UserMessage(text=prompt)
            response_text = await chat.send_message(user_message)
            return {"text": response_text, "provider": provider, "model": model}
        except Exception as e:
            last_error = e
            logging.warning(f"LLM call failed on {provider}/{model}: {e}")
            continue

    raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Attempt to extract JSON object from model output."""
    if not text:
        return None
    # Trim code fences if present
    if '```' in text:
        parts = text.split('```')
        # Try to find a json fenced block
        for i in range(len(parts)):
            segment = parts[i]
            if segment.strip().lower().startswith('json') and i + 1 < len(parts):
                candidate = parts[i + 1]
                try:
                    return json.loads(candidate.strip())
                except Exception:
                    pass
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        # Try to find first and last braces
        try:
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start:end+1])
        except Exception:
            return None
    return None


def _derive_intensity(valence: Optional[float], arousal: Optional[float]) -> float:
    try:
        v = float(valence) if valence is not None else 0.0
        a = float(arousal) if arousal is not None else 0.5
        score = max(0.0, min(1.0, (abs(v) * 0.6 + a * 0.4)))
        return round(score * 10.0, 1)
    except Exception:
        return 5.0


async def analyze_emotion_with_ai(text: str, context: str = None) -> Dict[str, Any]:
    """Analyze emotion using AI (Chinese-optimized, structured JSON)."""
    try:
        system_message = (
            "你是一位严谨且富有共情的中文心理咨询助理。\n"
            "任务：基于来访者文本进行情绪评估，并严格输出 JSON（不包含任何多余文字）。\n"
            "输出字段：\n"
            "- emotion_primary: 从 [joy, sadness, anger, fear, anxiety, disgust, surprise, shame, guilt, love, neutral] 中选一项\n"
            "- valence: -1 到 1（负面到正面）\n"
            "- arousal: 0 到 1（激活度）\n"
            "- risk_score: 0 到 1（自伤/他伤/严重功能受损风险）\n"
            "- triggers: string[]（触发因素，0-5项）\n"
            "- distortions: string[]（认知偏差，0-3项，备选：[非黑即白, 过度概括, 灾难化, 读心术, 贴标签, 情绪化推理, 应该/必须, 否定积极, 预言未来, 选择性注意]）\n"
            "- actions: string[]（3-5条、每条≤24字、具体可执行的建议）\n"
            "- summary: string（1-2句、≤40字、共情总结）\n"
            "注意：如文本较长，先提取关键片段再评估；仅返回 JSON 对象。"
        )

        prompt = f"用户文本：{text}\n"
        if context:
            prompt += f"背景：{context}\n"
        prompt += "请严格按要求输出。"

        result = await _safe_llm_call(system_message, prompt)
        ai_json = _extract_json(result["text"]) if isinstance(result, dict) else None
        if not ai_json:
            # Fallback default
            ai_json = {
                "emotion_primary": "neutral",
                "valence": 0.0,
                "arousal": 0.5,
                "risk_score": 0.1,
                "triggers": [],
                "distortions": [],
                "actions": ["做一次4-7-8呼吸", "写下此刻最困扰的想法"],
                "summary": "我理解你当前的感受，先照顾好自己。",
            }
        return ai_json

    except Exception as e:
        logging.error(f"Error in emotion analysis: {e}")
        return {
            "emotion_primary": "neutral",
            "valence": 0.0,
            "arousal": 0.5,
            "risk_score": 0.1,
            "triggers": [],
            "distortions": [],
            "actions": ["做一次4-7-8呼吸", "写下此刻最困扰的想法"],
            "summary": "我理解你当前的感受，先照顾好自己。",
        }


async def get_crisis_support(text: str, user_context: str = None) -> Dict[str, Any]:
    """Get immediate crisis support response (Chinese, structured)."""
    try:
        system_message = (
            "你是一名危机干预助理。始终共情、非评判、关注当下可行步骤。\n"
            "输出 JSON：{\"immediate_support\": string, \"crisis_level\": 0-5, \"coping_strategies\": string[], \"seek_help\": boolean}。"
        )

        prompt = f"来访者：{text}\n"
        if user_context:
            prompt += f"用户信息：{user_context}\n"
        prompt += (
            "请先给出1-2句安抚性回应（immediate_support），评估危机等级（0=正常,5=需要紧急求助），"
            "并给出3-5条当下可执行策略（coping_strategies）。仅返回 JSON。"
        )

        result = await _safe_llm_call(system_message, prompt)
        parsed = _extract_json(result["text"]) if isinstance(result, dict) else None
        if not parsed:
            parsed = {
                "immediate_support": "我听到了你的困难，我们可以一步步来。先缓一缓，和我一起做3次深呼吸。",
                "crisis_level": 2,
                "coping_strategies": ["4-7-8呼吸", "冷水洗脸", "联系信任的人"],
                "seek_help": False,
            }
        return parsed

    except Exception as e:
        logging.error(f"Error in crisis support: {e}")
        return {
            "immediate_support": "我听到了你的困难，我们可以一步步来。先缓一缓，和我一起做3次深呼吸。",
            "crisis_level": 2,
            "coping_strategies": [
                "做5次缓慢深呼吸",
                "观察身边5样事物",
                "给自己一个温柔的提醒：这会过去"
            ],
            "seek_help": False
        }

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "GlowCare API - Mental Health Support"}

# User Management
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Emotion Tracking
@api_router.post("/emotions", response_model=EmotionEntry)
async def create_emotion_entry(emotion_data: EmotionCreate):
    # Analyze emotion with AI
    ai_analysis = await analyze_emotion_with_ai(
        emotion_data.text_input,
        emotion_data.context
    )

    # Derive intensity from valence/arousal when not provided
    intensity = float(ai_analysis.get("intensity") or _derive_intensity(
        ai_analysis.get("valence"), ai_analysis.get("arousal")
    ))

    # Create emotion entry
    emotion_entry = EmotionEntry(
        user_id=emotion_data.user_id,
        emotion=ai_analysis.get("emotion_primary", "neutral"),
        intensity=intensity,
        context=emotion_data.context,
        text_input=emotion_data.text_input,
        ai_analysis=json.dumps(ai_analysis, ensure_ascii=False),
        triggers=ai_analysis.get("triggers", []),
        source=emotion_data.source
    )

    await db.emotions.insert_one(emotion_entry.dict())
    return emotion_entry

@api_router.get("/emotions/{user_id}", response_model=List[EmotionEntry])
async def get_user_emotions(user_id: str, limit: int = 50):
    emotions = await db.emotions.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    return [EmotionEntry(**emotion) for emotion in emotions]

# Conversation Analysis
@api_router.post("/conversations/analyze", response_model=ConversationEntry)
async def analyze_conversation(conversation_data: ConversationCreate):
    # Get AI analysis and crisis support
    ai_analysis = await analyze_emotion_with_ai(conversation_data.conversation_text)
    crisis_response = await get_crisis_support(conversation_data.conversation_text)

    # Merge action suggestions (deduplicated, keep order)
    merged_actions: List[str] = []
    for arr in [ai_analysis.get("actions", []), crisis_response.get("coping_strategies", [])]:
        for item in arr:
            if item and item not in merged_actions:
                merged_actions.append(item)

    # Create conversation entry
    conversation_entry = ConversationEntry(
        user_id=conversation_data.user_id,
        conversation_text=conversation_data.conversation_text,
        analysis=ai_analysis,
        support_suggestions=merged_actions,
        crisis_level=int(crisis_response.get("crisis_level", 0))
    )

    await db.conversations.insert_one(conversation_entry.dict())
    return conversation_entry

# Crisis Support
@api_router.post("/support/crisis")
async def get_immediate_support(support_request: SupportRequest):
    if support_request.request_type == "crisis":
        response = await get_crisis_support(
            support_request.context or "用户请求危机支持",
            f"User ID: {support_request.user_id}"
        )
    elif support_request.request_type == "breathing":
        response = {
            "support_type": "breathing_exercise",
            "instructions": [
                "找一个舒适的坐姿",
                "轻闭双眼或柔和目光",
                "吸气4拍",
                "屏息4拍",
                "缓慢呼气6拍",
                "循环5-10次"
            ],
            "duration": "2-5分钟"
        }
    elif support_request.request_type == "cbt":
        response = {
            "support_type": "cbt_technique",
            "technique": "思维挑战",
            "steps": [
                "此刻困扰你的自动化想法是什么？",
                "这个想法是有帮助还是有害？",
                "支持这个想法的证据是什么？",
                "与之相反的证据是什么？",
                "如果朋友这样想你会怎么回应？",
                "可以换成更平衡的表述吗？"
            ]
        }
    else:
        response = await get_crisis_support(
            support_request.context or "一般支持请求"
        )

    return response

# Mood Reports
@api_router.get("/reports/{user_id}/mood")
async def generate_mood_report(user_id: str, period: str = "week"):
    # Calculate date range
    now = datetime.utcnow()
    if period == "week":
        start_date = now - timedelta(days=7)
    else:  # month
        start_date = now - timedelta(days=30)

    # Get emotions from period
    emotions = await db.emotions.find({
        "user_id": user_id,
        "timestamp": {"$gte": start_date}
    }).to_list(1000)

    if not emotions:
        return {
            "message": "No data available for this period",
            "period": period,
            "user_id": user_id
        }

    # Analyze patterns
    emotion_counts: Dict[str, int] = {}
    total_intensity = 0.0

    for emotion in emotions:
        emotion_type = emotion.get("emotion", "neutral")
        emotion_counts[emotion_type] = emotion_counts.get(emotion_type, 0) + 1
        try:
            total_intensity += float(emotion.get("intensity", 0))
        except Exception:
            total_intensity += 0.0

    avg_intensity = total_intensity / len(emotions) if emotions else 0.0
    most_common_emotion = max(emotion_counts, key=emotion_counts.get)

    # Generate AI insights (Chinese)
    try:
        system_message = (
            "你是一名心理健康数据分析助理。基于情绪记录数据，生成3-5条简洁可执行的洞察与建议（中文）。"
        )

        prompt = f"""{period}期间数据：\n- 记录总数：{len(emotions)}\n- 最常见情绪：{most_common_emotion}\n- 平均强度：{avg_intensity:.1f}/10\n- 情绪分布：{emotion_counts}\n请用中文给出3-5条洞察与3-5条建议。"""

        result = await _safe_llm_call(system_message, prompt)
        ai_insights = result.get("text") if isinstance(result, dict) else ""

    except Exception as e:
        logging.warning(f"Insight generation failed: {e}")
        ai_insights = "Unable to generate insights at this time."

    report = {
        "user_id": user_id,
        "period": period,
        "summary": {
            "total_entries": len(emotions),
            "average_intensity": round(avg_intensity, 1),
            "most_common_emotion": most_common_emotion,
            "emotion_breakdown": emotion_counts
        },
        "ai_insights": ai_insights,
        "generated_at": datetime.utcnow().isoformat()
    }

    return report

# Health check
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "ai": "available" if EMERGENT_LLM_KEY else "unavailable",
            "preferred_model": f"{PREFERRED_PROVIDER}/{PREFERRED_MODEL}"
        }
    }

# Include router in main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()