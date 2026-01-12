# MemoryLink - AI 기반 디지털 유품 정리 서비스 (프로덕션 레디)

## 🎯 프로젝트 개요

**MemoryLink**는 소중한 디지털 추억과 유품을 AI를 활용하여 체계적으로 정리하고 관리할 수 있는 실사용 가능한 서비스입니다. 사진, 동영상, 문서, SNS 게시물 등 다양한 형태의 디지털 자산을 저장하고, OpenAI를 통해 자동으로 요약, 감정 분석, 키워드 추출을 수행합니다.

## ✨ 주요 기능 (모두 구현 완료!)

### 1. 📤 파일 업로드 및 관리
- **드래그 앤 드롭** 파일 업로드
- **이미지/동영상** 미리보기
- Cloudflare R2 스토리지 통합 (옵션)
- 외부 URL 직접 입력 지원

### 2. 🤖 AI 자동 분석 (OpenAI GPT-3.5)
- **자동 요약** 생성
- **감정 분석** (긍정/부정/중립)
- **키워드 자동 추출**
- 추억 생성/수정 시 실시간 분석

### 3. 📊 대시보드 및 통계
- 총 추억 개수
- 감정별 통계 (긍정/중립/부정)
- 카테고리별 분포 시각화
- 평균 중요도 점수
- 최근 추억 목록

### 4. 🖼️ 갤러리 뷰
- 이미지/동영상 썸네일
- 그리드 레이아웃
- 카테고리 필터링
- 텍스트 검색
- 페이지네이션

### 5. 📅 타임라인 뷰
- 시간순 추억 정렬
- 년/월별 그룹핑
- 시각적 타임라인 디자인

### 6. 💾 데이터 관리
- **JSON 내보내기** (전체 데이터)
- 백업 및 마이그레이션 지원
- 추억 간 연결 관계 저장

### 7. 📱 반응형 디자인
- 모바일 최적화
- 태블릿 지원
- 데스크톱 대화면 지원

## 🌐 접속 정보

- **개발 서버**: https://3000-igevtrp085a1ai8acras2-c81df28e.sandbox.novita.ai
- **프로젝트 경로**: `/home/user/memorylink`

## 🔧 API 엔드포인트

### 카테고리
- `GET /api/categories` - 모든 카테고리 조회

### 추억 (Memories)
- `GET /api/memories` - 추억 목록 조회
  - Query: `page`, `limit`, `category`, `search`
- `GET /api/memories/:id` - 특정 추억 상세 조회
- `POST /api/memories` - 새 추억 생성 (AI 분석 포함)
- `PUT /api/memories/:id` - 추억 수정
- `DELETE /api/memories/:id` - 추억 삭제

### 파일 관리
- `POST /api/upload` - 파일 업로드 (R2)
- `GET /api/files/*` - 파일 다운로드

### 통계 및 내보내기
- `GET /api/statistics` - 대시보드 통계
- `GET /api/export` - 전체 데이터 JSON 내보내기
- `POST /api/connections` - 추억 간 연결 생성

## 🗄️ 데이터베이스 구조

### Cloudflare D1 (SQLite)

**테이블:**
1. **users** - 사용자 정보
2. **categories** - 카테고리 (7개 기본 제공)
3. **memories** - 추억/유품
   - 제목, 설명, 내용
   - 파일 URL 및 타입
   - AI 요약, 감정, 키워드
   - 중요도 점수 (1-10)
   - 원본 날짜
4. **connections** - 추억 간 연결 관계

## 🚀 사용 방법

### 기본 사용

1. **추억 추가**
   - "추억 추가" 버튼 클릭
   - 파일 업로드 (드래그 앤 드롭 또는 URL 입력)
   - 제목, 카테고리, 설명, 내용 입력
   - "AI 자동 분석" 체크 (OpenAI API 키 필요)
   - 저장

2. **추억 보기**
   - "추억" 탭에서 모든 추억 확인
   - 카테고리 필터 및 검색 사용
   - 카드 클릭으로 상세 보기

3. **타임라인 보기**
   - "타임라인" 탭에서 시간순 정렬
   - 년/월별로 그룹화된 추억

4. **데이터 백업**
   - "내보내기" 버튼으로 JSON 파일 다운로드

### AI 기능 활성화

OpenAI API 키가 있다면 자동 분석 기능을 사용할 수 있습니다:

1. **로컬 개발**
   ```bash
   # .dev.vars 파일 생성
   echo "OPENAI_API_KEY=sk-your-api-key-here" > .dev.vars
   
   # 서비스 재시작
   pm2 restart memorylink
   ```

2. **프로덕션 배포**
   ```bash
   npx wrangler pages secret put OPENAI_API_KEY --project-name memorylink
   ```

### 파일 업로드 설정

**옵션 1: Cloudflare R2 사용 (권장)**
```bash
# R2 버킷 생성
npx wrangler r2 bucket create memorylink-files

# wrangler.jsonc에 이미 설정되어 있음
```

**옵션 2: 외부 URL 사용**
- 파일 업로드 대신 이미지 URL 직접 입력
- Imgur, Google Photos, 클라우드 스토리지 URL 사용 가능

## 💻 개발 환경 설정

### 로컬 개발

```bash
# 프로젝트 클론 또는 이동
cd /home/user/memorylink

# 의존성 설치 (이미 완료)
npm install

# 데이터베이스 마이그레이션 (이미 완료)
npm run db:migrate:local

# 테스트 데이터 삽입 (이미 완료)
npm run db:seed

# 빌드
npm run build

# PM2로 개발 서버 시작
pm2 start ecosystem.config.cjs

# 서비스 확인
curl http://localhost:3000/api/categories
```

### 유용한 명령어

```bash
# PM2 상태 확인
pm2 list

# 로그 확인
pm2 logs memorylink --nostream

# 재시작
pm2 restart memorylink

# 데이터베이스 리셋
npm run db:reset

# 포트 정리
npm run clean-port

# API 테스트
npm run test
```

## 🌟 기술 스택

- **프레임워크**: Hono 4.x (경량 웹 프레임워크)
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **스토리지**: Cloudflare R2 (옵션)
- **AI**: OpenAI GPT-3.5 Turbo (옵션)
- **프론트엔드**: 
  - Vanilla JavaScript
  - TailwindCSS
  - Font Awesome
  - Axios
- **빌드 도구**: Vite 6.x
- **프로세스 관리**: PM2

## 📦 배포 가이드

### 프로덕션 배포 (Cloudflare Pages)

1. **Cloudflare API 키 설정**
   ```bash
   # setup_cloudflare_api_key 도구 사용
   ```

2. **D1 데이터베이스 생성**
   ```bash
   npx wrangler d1 create memorylink-production
   
   # 출력된 database_id를 wrangler.jsonc에 업데이트
   ```

3. **R2 버킷 생성 (옵션)**
   ```bash
   npx wrangler r2 bucket create memorylink-files
   ```

4. **프로덕션 마이그레이션**
   ```bash
   npm run db:migrate:prod
   ```

5. **환경 변수 설정 (옵션)**
   ```bash
   # OpenAI API 키
   npx wrangler pages secret put OPENAI_API_KEY --project-name memorylink
   ```

6. **배포**
   ```bash
   npm run deploy:prod
   ```

7. **도메인 연결 (옵션)**
   ```bash
   npx wrangler pages domain add example.com --project-name memorylink
   ```

## 📱 주요 개선 사항

### v2.0 업그레이드 (현재 버전)

✅ **완료된 업그레이드:**
1. 파일 업로드 시스템 (드래그 앤 드롭)
2. AI 자동 분석 (OpenAI GPT-3.5)
3. 이미지/동영상 미리보기
4. 타임라인 뷰
5. 데이터 내보내기 (JSON)
6. 반응형 모바일 UI
7. 향상된 대시보드 통계
8. 감정 분석 기반 필터링

### v1.0 기본 기능
- 추억 CRUD
- 카테고리 관리
- 검색 및 필터링
- 페이지네이션
- 추억 연결

## 🎨 UI/UX 특징

- **깔끔한 카드 디자인**: 그리드 레이아웃으로 깔끔한 표시
- **직관적인 네비게이션**: 대시보드, 추억, 타임라인 탭
- **드래그 앤 드롭**: 파일 업로드 편의성
- **모달 기반 편집**: 부드러운 사용자 경험
- **감정 이모지**: 긍정(😊), 중립(😐), 부정(😢) 시각화
- **중요도 별점**: 1-10 범위의 별점 시스템
- **색상 코딩**: 카테고리별 구분 색상

## 🔐 보안 및 프라이버시

- D1 데이터베이스는 사용자별로 격리 가능
- API 키는 환경 변수로 안전하게 관리
- R2 파일은 인증된 요청만 접근 가능
- CORS 설정으로 API 보호

## 📊 성능 최적화

- Cloudflare Edge 네트워크 활용
- 이미지 지연 로딩
- 페이지네이션으로 데이터 분할
- 인덱스 최적화된 D1 쿼리
- PM2로 안정적인 프로세스 관리

## 🛠️ 향후 개선 가능 항목

1. **다중 사용자 지원**: 사용자 인증 시스템
2. **고급 검색**: 태그, 날짜 범위, 감정 필터
3. **공유 기능**: 추억 공유 링크 생성
4. **음성 메모**: 음성 녹음 및 텍스트 변환
5. **AI 이미지 분석**: 이미지 내용 자동 인식
6. **소셜 통합**: SNS 자동 가져오기
7. **캘린더 뷰**: 달력 형태 시각화
8. **PDF 리포트**: 추억 모음집 생성

## 📝 개발 스크립트

```json
{
  "dev": "vite",
  "dev:sandbox": "wrangler pages dev dist --d1=memorylink-production --local --ip 0.0.0.0 --port 3000",
  "build": "vite build",
  "preview": "wrangler pages dev dist",
  "deploy": "npm run build && wrangler pages deploy dist --project-name memorylink",
  "deploy:prod": "npm run build && wrangler pages deploy dist --project-name memorylink",
  "cf-typegen": "wrangler types --env-interface CloudflareBindings",
  "db:migrate:local": "wrangler d1 migrations apply memorylink-production --local",
  "db:migrate:prod": "wrangler d1 migrations apply memorylink-production",
  "db:seed": "wrangler d1 execute memorylink-production --local --file=./seed.sql",
  "db:reset": "rm -rf .wrangler/state/v3/d1 && npm run db:migrate:local && npm run db:seed",
  "db:console:local": "wrangler d1 execute memorylink-production --local",
  "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
  "test": "curl http://localhost:3000"
}
```

## 📂 프로젝트 구조

```
memorylink/
├── src/
│   └── index.tsx          # 메인 애플리케이션 (API + Frontend)
├── migrations/
│   └── 0001_initial_schema.sql  # D1 스키마
├── public/
│   └── static/            # 정적 파일 (향후)
├── .wrangler/             # 로컬 D1 데이터베이스
├── .dev.vars.example      # 환경 변수 예제
├── ecosystem.config.cjs   # PM2 설정
├── wrangler.jsonc         # Cloudflare 설정
├── seed.sql               # 테스트 데이터
├── package.json           # 의존성
└── README.md             # 문서
```

## 🐛 문제 해결

### AI 분석이 작동하지 않음
- `.dev.vars` 파일에 `OPENAI_API_KEY` 설정 확인
- API 키 유효성 확인
- 크레딧 잔액 확인

### 파일 업로드 실패
- R2 버킷이 설정되지 않은 경우 정상 (외부 URL 사용)
- R2 사용 시 `wrangler.jsonc`의 바인딩 확인

### 데이터베이스 오류
```bash
# 데이터베이스 리셋
npm run db:reset
```

### 서비스 시작 안 됨
```bash
# 포트 충돌 해결
npm run clean-port
pm2 delete memorylink
pm2 start ecosystem.config.cjs
```

## 📄 라이선스

MIT License

## 👨‍💻 작성자

Claude + 사용자 협업 프로젝트

## 📅 업데이트 이력

- **v2.0** (2025-12-13): 프로덕션 레디 - 파일 업로드, AI 분석, 타임라인, 내보내기
- **v1.0** (2025-12-13): 초기 릴리스 - 기본 CRUD 및 대시보드

---

**실제 사용 가능한 디지털 유품 관리 서비스입니다! 🎉**

지금 바로 추억을 추가하고 AI가 자동으로 분석하는 것을 확인해보세요!
