# MemoryLink - AI 기반 디지털 유품 정리 서비스

## 프로젝트 개요

**MemoryLink**는 소중한 디지털 추억과 유품을 체계적으로 정리하고 관리할 수 있는 AI 기반 서비스입니다. 사진, 동영상, 문서, SNS 게시물 등 다양한 형태의 디지털 자산을 카테고리별로 분류하고, AI를 통해 자동으로 요약 및 감정 분석을 수행합니다.

## 주요 기능

### ✅ 완료된 기능

1. **디지털 추억 관리**
   - 추억 생성, 수정, 삭제 (CRUD)
   - 카테고리별 분류 (사진, 동영상, 문서, SNS, 이메일, 음성, 기타)
   - 중요도 점수 설정 (1-10)
   - 원본 날짜 기록

2. **대시보드**
   - 총 추억 개수 통계
   - 카테고리별 분포 시각화
   - 최근 추억 목록
   - 감정 분석 통계

3. **검색 및 필터링**
   - 카테고리별 필터링
   - 텍스트 검색 (제목, 설명, 내용)
   - 페이지네이션

4. **추억 연결**
   - 관련 추억 간 연결 관계 설정
   - 연결 강도 및 유형 지정

5. **AI 통합 준비**
   - AI 요약 저장 필드
   - 감정 분석 (positive, negative, neutral)
   - 키워드 추출 필드

### 🚧 향후 구현 예정

1. **실시간 AI 분석**
   - OpenAI API를 통한 자동 요약 생성
   - 감정 분석 자동화
   - 키워드 자동 추출

2. **파일 업로드**
   - Cloudflare R2를 통한 이미지/동영상 저장
   - 파일 미리보기

3. **타임라인 뷰**
   - 시간 순서대로 추억 시각화
   - 연결된 추억 네트워크 그래프

4. **공유 기능**
   - 선택한 추억 공유 링크 생성
   - 가족/친구와 협업 기능

## URL

- **개발 서버**: https://3000-igevtrp085a1ai8acras2-c81df28e.sandbox.novita.ai
- **API 엔드포인트**: `/api/*`
- **GitHub**: (추후 업데이트)

## API 엔드포인트

### 카테고리
- `GET /api/categories` - 모든 카테고리 조회

### 추억 (Memories)
- `GET /api/memories` - 추억 목록 조회 (페이지네이션, 필터, 검색)
  - Query params: `page`, `limit`, `category`, `search`
- `GET /api/memories/:id` - 특정 추억 상세 조회
- `POST /api/memories` - 새 추억 생성
- `PUT /api/memories/:id` - 추억 수정
- `DELETE /api/memories/:id` - 추억 삭제

### 통계
- `GET /api/statistics` - 대시보드 통계 데이터

### 연결
- `POST /api/connections` - 추억 간 연결 생성

## 데이터 아키텍처

### 데이터베이스: Cloudflare D1 (SQLite)

#### 테이블 구조

1. **users** - 사용자 정보
   - id, email, name, avatar_url, created_at, updated_at

2. **categories** - 카테고리
   - id, name, icon, color, created_at

3. **memories** - 추억/유품
   - id, user_id, category_id, title, description, content
   - file_url, file_type, tags (JSON)
   - ai_summary, ai_sentiment, ai_keywords (JSON)
   - importance_score (1-10), is_archived
   - created_at, updated_at, original_date

4. **connections** - 추억 간 연결
   - id, memory_id_1, memory_id_2
   - connection_type (related, similar, sequence)
   - strength (1-10), created_at

### 저장 서비스
- **D1 Database**: 관계형 데이터 저장 (현재 사용 중)
- **R2 Storage**: 파일 저장 (향후 구현)
- **KV Storage**: 캐시 및 설정 (향후 구현)

## 사용 가이드

### 1. 대시보드
- 메인 화면에서 전체 통계와 최근 추억을 확인할 수 있습니다
- 카테고리별 분포를 시각적으로 확인 가능

### 2. 추억 추가
- "추억 추가" 버튼 클릭
- 제목, 카테고리, 설명, 내용, 중요도 입력
- 원본 날짜 설정 가능

### 3. 추억 보기
- "추억 보기" 탭에서 모든 추억 확인
- 카테고리 필터 및 검색 기능 사용
- 카드를 클릭하여 상세 정보 확인

### 4. 추억 수정/삭제
- 상세 페이지에서 편집 또는 삭제 버튼 클릭

## 기술 스택

- **프레임워크**: Hono (경량 웹 프레임워크)
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **프론트엔드**: Vanilla JavaScript + TailwindCSS
- **아이콘**: Font Awesome
- **HTTP 클라이언트**: Axios

## 배포

### 플랫폼
- **Cloudflare Pages**
- **상태**: ✅ 로컬 개발 환경 활성화

### 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 테스트 데이터 삽입
npm run db:seed

# 빌드
npm run build

# PM2로 개발 서버 시작
pm2 start ecosystem.config.cjs

# 서비스 확인
curl http://localhost:3000/api/categories
```

### 프로덕션 배포

```bash
# Cloudflare D1 데이터베이스 생성
npx wrangler d1 create memorylink-production

# wrangler.jsonc에 database_id 업데이트

# 프로덕션 마이그레이션
npm run db:migrate:prod

# 배포
npm run deploy:prod
```

## 개발 스크립트

```json
{
  "dev": "vite",
  "dev:sandbox": "wrangler pages dev dist --d1=memorylink-production --local --ip 0.0.0.0 --port 3000",
  "build": "vite build",
  "deploy": "npm run build && wrangler pages deploy dist --project-name memorylink",
  "db:migrate:local": "wrangler d1 migrations apply memorylink-production --local",
  "db:migrate:prod": "wrangler d1 migrations apply memorylink-production",
  "db:seed": "wrangler d1 execute memorylink-production --local --file=./seed.sql",
  "db:reset": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local && npm run db:seed",
  "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
  "test": "curl http://localhost:3000"
}
```

## 프로젝트 구조

```
memorylink/
├── src/
│   └── index.tsx          # 메인 Hono 애플리케이션 (API + Frontend)
├── migrations/
│   └── 0001_initial_schema.sql  # D1 데이터베이스 스키마
├── public/
│   └── static/            # 정적 파일 (향후 추가)
├── .wrangler/             # 로컬 D1 데이터베이스
├── ecosystem.config.cjs   # PM2 설정
├── wrangler.jsonc         # Cloudflare 설정
├── seed.sql               # 테스트 데이터
├── package.json           # 의존성 및 스크립트
└── README.md             # 프로젝트 문서
```

## 다음 개발 단계 (권장)

1. **파일 업로드 기능**
   - Cloudflare R2 바인딩 추가
   - 파일 업로드 API 구현
   - 프론트엔드 파일 선택 UI

2. **AI 분석 자동화**
   - OpenAI API 통합 (.dev.vars에 API 키 저장)
   - 추억 생성/수정 시 자동 요약 생성
   - 감정 분석 및 키워드 추출

3. **타임라인 뷰**
   - 시간순 추억 정렬 UI
   - Chart.js를 통한 시각화

4. **사용자 인증**
   - Cloudflare Access 또는 Auth0 통합
   - 사용자별 데이터 분리

5. **공유 기능**
   - 공유 링크 생성 API
   - 공개/비공개 설정

## 라이선스

MIT License

## 최종 업데이트

2025-12-13
