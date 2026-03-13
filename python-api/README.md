# MemoryLink Python API

FastAPI 기반의 고급 AI 분석 및 데이터 처리 백엔드

## 📋 개요

MemoryLink의 Python 백엔드는 Hono/TypeScript 프론트엔드와 함께 작동하여 고급 AI 분석, 데이터 처리, 통계 분석 기능을 제공합니다.

## ✨ 주요 기능

### 🤖 AI 분석
- **감정 분석**: 텍스트의 긍정/부정/중립 감정 판단
- **키워드 추출**: 중요 키워드 자동 추출
- **요약 생성**: 긴 텍스트 자동 요약
- **일괄 분석**: 여러 추억 동시 분석

### 📊 고급 통계
- 카테고리별 통계
- 감정별 분포
- 월별 추억 추세
- 평균 중요도 계산

### 🔍 데이터 조회
- 추억 목록 조회 (페이지네이션)
- 고급 필터링
- JSON 응답

## 🚀 시작하기

### 의존성 설치

```bash
pip3 install -r requirements.txt
```

### 서버 실행

```bash
# 직접 실행
python3 main.py

# 또는 uvicorn 사용
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 또는 npm 스크립트 사용
npm run dev:python
```

### 헬스 체크

```bash
curl http://localhost:8000/health
```

## 📡 API 엔드포인트

### 기본
- `GET /` - API 정보
- `GET /health` - 헬스 체크

### AI 분석
- `POST /api/ai/analyze` - 텍스트 AI 분석
- `POST /api/memories/batch-analyze` - 일괄 추억 분석

### 데이터 조회
- `GET /api/memories` - 추억 목록
- `GET /api/stats/advanced` - 고급 통계

## 🔧 사용 예제

### AI 분석

```python
import requests

response = requests.post('http://localhost:8000/api/ai/analyze', json={
    "text": "오늘은 정말 행복한 하루였어요!",
    "analyze_sentiment": True,
    "extract_keywords": True,
    "generate_summary": True
})

print(response.json())
# {
#   "sentiment": "positive",
#   "keywords": ["오늘", "행복", "하루"],
#   "summary": "오늘은 정말 행복한 하루였어요!"
# }
```

### 고급 통계

```bash
curl http://localhost:8000/api/stats/advanced
```

## 📁 파일 구조

```
python-api/
├── main.py          # FastAPI 애플리케이션
├── models.py        # Pydantic 모델
├── utils.py         # 유틸리티 함수
└── requirements.txt # 의존성 목록
```

## 🛠️ 기술 스택

- **FastAPI**: 최신 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Pydantic**: 데이터 검증
- **aiosqlite**: 비동기 SQLite
- **Python 3.12**: 최신 Python

## 🔗 통합

Hono/TypeScript 프론트엔드와 함께 사용:

```typescript
// Hono에서 Python API 호출
const response = await fetch('http://localhost:8000/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: memory.content,
    analyze_sentiment: true
  })
});

const analysis = await response.json();
```

## 📝 TODO

- [ ] OpenAI API 통합
- [ ] 고급 NLP 분석
- [ ] 이미지 분석 (Vision API)
- [ ] 캐싱 추가 (Redis)
- [ ] 테스트 코드 작성
- [ ] Docker 이미지
