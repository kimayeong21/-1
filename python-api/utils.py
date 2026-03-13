"""
Python API 유틸리티 함수
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional
import jwt

SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    """SHA-256으로 비밀번호 해싱"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWT 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def analyze_text_sentiment(text: str) -> str:
    """간단한 감정 분석"""
    text_lower = text.lower()
    
    positive_words = [
        '좋', '행복', '기쁨', '사랑', '즐거', '멋진', '훌륭', '최고',
        '완벽', '대단', '감동', '고마', '축하', '성공', '환상'
    ]
    negative_words = [
        '슬프', '나쁘', '힘들', '아프', '싫', '우울', '끔찍',
        '실망', '후회', '불안', '두렵', '외로', '쓸쓸', '미안'
    ]
    
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        return 'positive'
    elif negative_count > positive_count:
        return 'negative'
    else:
        return 'neutral'

def extract_keywords(text: str, max_keywords: int = 5) -> list:
    """키워드 추출"""
    # 간단한 구현: 3글자 이상 단어 추출
    words = text.split()
    keywords = []
    
    # 불용어 제거
    stopwords = ['이', '그', '저', '것', '수', '등', '및', '때', '등등', '것이']
    
    for word in words:
        # 특수문자 제거
        cleaned = ''.join(c for c in word if c.isalnum())
        if len(cleaned) >= 3 and cleaned not in stopwords:
            keywords.append(cleaned)
    
    # 중복 제거 및 제한
    unique_keywords = list(dict.fromkeys(keywords))[:max_keywords]
    return unique_keywords

def generate_summary(text: str, max_length: int = 100) -> str:
    """텍스트 요약 생성"""
    if len(text) <= max_length:
        return text
    
    # 문장 단위로 분리
    sentences = text.split('.')
    summary = ""
    
    for sentence in sentences:
        if len(summary) + len(sentence) <= max_length:
            summary += sentence.strip() + ". "
        else:
            break
    
    return summary.strip() if summary else text[:max_length] + "..."
