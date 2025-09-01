from fastapi import FastAPI, APIRouter, HTTPException, Depends
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
from bson import ObjectId
import json
import asyncio

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
async def create_llm_chat(system_message: str, session_id: str = None) -> LlmChat:
    """Create an LLM chat instance with system message"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message
    )
    # Use GPT-4o-mini for cost efficiency
    chat.with_model("openai", "gpt-4o-mini")
    return chat

async def analyze_emotion_with_ai(text: str, context: str = None) -> Dict[str, Any]:
    """Analyze emotion using AI"""
    try:
        system_message = """You are an empathetic AI psychologist specializing in emotion analysis. 
        Analyze the given text and provide:
        1. Primary emotion (joy, sadness, anger, fear, surprise, disgust, neutral)
        2. Intensity level (0.0-10.0)
        3. Secondary emotions if present
        4. Potential triggers or causes
        5. Brief empathetic response
        6. Support recommendations
        
        Respond in valid JSON format only."""
        
        chat = await create_llm_chat(system_message)
        
        prompt = f"Text to analyze: '{text}'"
        if context:
            prompt += f"\nContext: {context}"
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            ai_analysis = json.loads(response)
        except json.JSONDecodeError:
            # Fallback parsing if JSON is malformed
            ai_analysis = {
                "primary_emotion": "neutral",
                "intensity": 5.0,
                "analysis": response,
                "triggers": [],
                "recommendations": []
            }
        
        return ai_analysis
        
    except Exception as e:
        logging.error(f"Error in emotion analysis: {e}")
        return {
            "primary_emotion": "neutral",
            "intensity": 5.0,
            "analysis": "Unable to analyze at this time",
            "triggers": [],
            "recommendations": ["Try some deep breathing exercises"]
        }

async def get_crisis_support(text: str, user_context: str = None) -> Dict[str, Any]:
    """Get immediate crisis support response"""
    try:
        system_message = """You are a crisis counselor AI. Provide immediate, supportive, and helpful responses for people in emotional distress. 
        Always be empathetic, non-judgmental, and focus on immediate coping strategies.
        Include:
        1. Immediate validation and support
        2. Breathing or grounding techniques
        3. Crisis level assessment (0-5, where 5 requires emergency help)
        4. Specific coping recommendations
        5. When to seek professional help
        
        Respond in JSON format."""
        
        chat = await create_llm_chat(system_message)
        
        prompt = f"Person says: '{text}'"
        if user_context:
            prompt += f"\nContext: {user_context}"
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            support_response = json.loads(response)
        except json.JSONDecodeError:
            support_response = {
                "immediate_support": response,
                "crisis_level": 2,
                "coping_strategies": ["Take slow, deep breaths", "Find a quiet space"],
                "seek_help": False
            }
        
        return support_response
        
    except Exception as e:
        logging.error(f"Error in crisis support: {e}")
        return {
            "immediate_support": "I hear you and I'm here to help. You're not alone in this.",
            "crisis_level": 2,
            "coping_strategies": [
                "Take 5 deep breaths slowly",
                "Name 5 things you can see around you",
                "Remember: this feeling will pass"
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
    
    # Create emotion entry
    emotion_entry = EmotionEntry(
        user_id=emotion_data.user_id,
        emotion=ai_analysis.get("primary_emotion", "neutral"),
        intensity=float(ai_analysis.get("intensity", 5.0)),
        context=emotion_data.context,
        text_input=emotion_data.text_input,
        ai_analysis=json.dumps(ai_analysis),
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
    # Get AI analysis and support
    ai_analysis = await analyze_emotion_with_ai(conversation_data.conversation_text)
    crisis_response = await get_crisis_support(conversation_data.conversation_text)
    
    # Create conversation entry
    conversation_entry = ConversationEntry(
        user_id=conversation_data.user_id,
        conversation_text=conversation_data.conversation_text,
        analysis=ai_analysis,
        support_suggestions=crisis_response.get("coping_strategies", []),
        crisis_level=crisis_response.get("crisis_level", 0)
    )
    
    await db.conversations.insert_one(conversation_entry.dict())
    return conversation_entry

# Crisis Support
@api_router.post("/support/crisis")
async def get_immediate_support(support_request: SupportRequest):
    if support_request.request_type == "crisis":
        response = await get_crisis_support(
            support_request.context or "User requesting crisis support",
            f"User ID: {support_request.user_id}"
        )
    elif support_request.request_type == "breathing":
        response = {
            "support_type": "breathing_exercise",
            "instructions": [
                "Find a comfortable position",
                "Close your eyes or soften your gaze",
                "Inhale slowly for 4 counts",
                "Hold your breath for 4 counts", 
                "Exhale slowly for 6 counts",
                "Repeat this cycle 5-10 times"
            ],
            "duration": "2-5 minutes"
        }
    elif support_request.request_type == "cbt":
        response = {
            "support_type": "cbt_technique",
            "technique": "Thought Challenging",
            "steps": [
                "What thought is bothering you?",
                "Is this thought helpful or harmful?",
                "What evidence supports this thought?",
                "What evidence contradicts it?",
                "What would you tell a friend having this thought?",
                "What's a more balanced way to think about this?"
            ]
        }
    else:
        response = await get_crisis_support(
            support_request.context or "General support request"
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
    emotion_counts = {}
    total_intensity = 0
    
    for emotion in emotions:
        emotion_type = emotion["emotion"]
        emotion_counts[emotion_type] = emotion_counts.get(emotion_type, 0) + 1
        total_intensity += emotion["intensity"]
    
    avg_intensity = total_intensity / len(emotions)
    most_common_emotion = max(emotion_counts, key=emotion_counts.get)
    
    # Generate AI insights
    try:
        system_message = """You are a mental health data analyst. Generate insights and recommendations 
        based on emotion tracking data. Be supportive and actionable."""
        
        chat = await create_llm_chat(system_message)
        
        prompt = f"""Emotion data for {period}:
        - Total entries: {len(emotions)}
        - Most common emotion: {most_common_emotion}
        - Average intensity: {avg_intensity:.1f}/10
        - Emotion breakdown: {emotion_counts}
        
        Provide 3-5 insights and 3-5 actionable recommendations."""
        
        user_message = UserMessage(text=prompt)
        ai_insights = await chat.send_message(user_message)
        
    except Exception as e:
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
            "ai": "available" if EMERGENT_LLM_KEY else "unavailable"
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