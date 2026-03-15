#!/bin/bash

# MemoryLink Python API 시작 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}============================================================${NC}"
echo -e "${GREEN}🚀 MemoryLink Python API Server${NC}"
echo -e "${PURPLE}============================================================${NC}"

# Python 버전 확인
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${BLUE}🐍 Python Version: ${PYTHON_VERSION}${NC}"

# 의존성 확인
if [ ! -d ".venv" ] && [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ requirements.txt not found${NC}"
    exit 1
fi

# 포트 8000 확인
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 8000 is already in use${NC}"
    echo -e "${YELLOW}   Killing existing process...${NC}"
    fuser -k 8000/tcp 2>/dev/null || true
    sleep 1
fi

echo -e "${PURPLE}============================================================${NC}"
echo -e "${GREEN}📍 Server URLs:${NC}"
echo -e "   • API: ${BLUE}http://localhost:8000${NC}"
echo -e "   • Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "   • ReDoc: ${BLUE}http://localhost:8000/redoc${NC}"
echo -e "   • Health: ${BLUE}http://localhost:8000/health${NC}"
echo -e "${PURPLE}============================================================${NC}"
echo -e "${GREEN}✨ Press CTRL+C to stop the server${NC}"
echo -e "${PURPLE}============================================================${NC}"

# Python API 시작
cd "$(dirname "$0")"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
