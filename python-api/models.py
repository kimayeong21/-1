"""
데이터베이스 모델 정의
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class User(BaseModel):
    id: Optional[int] = None
    email: str
    name: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

class Memory(BaseModel):
    id: Optional[int] = None
    user_id: int
    category_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    tags: Optional[List[str]] = None
    ai_summary: Optional[str] = None
    ai_sentiment: Optional[str] = None
    ai_keywords: Optional[List[str]] = None
    importance_score: int = Field(default=5, ge=1, le=10)
    is_archived: int = 0
    original_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Category(BaseModel):
    id: Optional[int] = None
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    created_at: Optional[datetime] = None

class AIAnalysis(BaseModel):
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    keywords: Optional[List[str]] = None
    confidence: Optional[float] = None
