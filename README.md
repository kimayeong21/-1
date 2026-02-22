# MemoryLink v3.0 - AI 기반 디지털 유품 정리 서비스 (인증 시스템 완비)

## 🎯 프로젝트 개요

**MemoryLink**는 사용자 인증과 AI 분석을 갖춘 완전한 디지털 추억 관리 서비스입니다. 회원가입 후 로그인하여 개인의 소중한 추억을 안전하게 보관하고, AI가 자동으로 분석해줍니다.

## ✨ 주요 기능 (v3.0 완전판)

### 🔐 사용자 인증 시스템 (NEW!)
- **회원가입**: 이메일, 비밀번호, 이름으로 간편 가입
- **로그인/로그아웃**: 세션 기반 인증 (쿠키)
- **비밀번호 보안**: Web Crypto API (SHA-256 해싱)
- **사용자별 데이터 격리**: 각 사용자의 추억은 완전히 분리
- **아바타 자동 생성**: UI Avatars로 프로필 이미지 생성

### 📷 실제 사진 데이터 (NEW!)
- **10개의 고품질 샘플 이미지** (Unsplash)
- 가족 여행, 졸업식, 편지, 친구 모임, 생일 파티
- 일몰 풍경, 카페, 산책길 등 다양한 테마
- 모든 추억에 실제 이미지 URL 연결

### 🤖 AI 자동 분석
- 자동 요약 생성
- 감정 분석 (긍정/부정/중립)
- 키워드 자동 추출
- OpenAI GPT-3.5 통합

### 📊 대시보드 및 통계
- 총 추억 개수
- 감정별 통계
- 카테고리별 분포
- 최근 추억 목록

### 🖼️ 갤러리 및 타임라인
- 이미지 썸네일 그리드
- 시간순 타임라인 뷰
- 검색 및 필터링
- 페이지네이션

### 📤 파일 관리
- 드래그 앤 드롭 업로드
- 이미지/동영상 지원
- 외부 URL 입력
- Cloudflare R2 통합 (옵션)

### 💾 데이터 관리
- JSON 내보내기
- 추억 간 연결
- 백업 및 복원

### 📱 반응형 디자인
- 모바일 최적화
- 태블릿 지원
- 데스크톱 대화면

## 🌐 접속 정보

**서비스 URL**: https://3000-igevtrp085a1ai8acras2-c81df28e.sandbox.novita.ai

**테스트 계정**:
- 이메일: `test@memorylink.com`
- 비밀번호: `password123`
- (또는 새로 회원가입하세요!)

## 🚀 빠른 시작

### 1️⃣ 회원가입
1. 브라우저에서 서비스 접속
2. "회원가입" 클릭
3. 이름, 이메일, 비밀번호 입력 (최소 6자)
4. "가입하기" 버튼 클릭

### 2️⃣ 로그인
1. 이메일과 비밀번호 입력
2. "로그인" 버튼 클릭
3. 자동으로 메인 화면으로 이동

### 3️⃣ 추억 둘러보기
- 대시보드에서 10개의 샘플 추억 확인
- 각 추억에는 실제 고품질 사진이 포함되어 있습니다
- 카드를 클릭하면 상세 정보 확인

### 4️⃣ 새 추억 추가
1. "추억 추가" 버튼 클릭
2. 이미지 URL 입력 또는 파일 업로드
3. 제목, 설명, 내용 작성
4. AI 자동 분석 체크
5. 저장

## 🗄️ 데이터베이스 구조

### Cloudflare D1 (SQLite)

**테이블:**

1. **users** - 사용자
   - id, email, password (해시), name, avatar_url
   - created_at, updated_at

2. **sessions** - 세션
   - id (UUID), user_id, expires_at
   - 7일 자동 만료

3. **categories** - 카테고리
   - 7개 기본 제공 (사진, 동영상, 문서, SNS, 이메일, 음성, 기타)

4. **memories** - 추억
   - user_id (FK) - 사용자별 데이터 격리
   - 제목, 설명, 내용
   - file_url, file_type (이미지/동영상)
   - AI 요약, 감정, 키워드
   - 중요도 점수, 원본 날짜

5. **connections** - 추억 연결
   - 관련 추억 간 관계

## 🔐 보안 기능

### 인증 보안
- **비밀번호 해싱**: Web Crypto API (SHA-256)
- **세션 쿠키**: HttpOnly, Secure, SameSite=Lax
- **자동 만료**: 7일 후 세션 자동 만료
- **CORS 보호**: API 접근 제한

### 데이터 보안
- **사용자별 격리**: 각 사용자는 자신의 데이터만 접근
- **권한 검증**: 모든 API에 인증 미들웨어
- **소유권 확인**: 수정/삭제 시 소유자 검증

## 📦 API 엔드포인트

### 인증 API (Public)
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### 추억 API (Protected - 로그인 필요)
- `GET /api/memories` - 내 추억 목록
- `GET /api/memories/:id` - 추억 상세
- `POST /api/memories` - 추억 생성
- `PUT /api/memories/:id` - 추억 수정
- `DELETE /api/memories/:id` - 추억 삭제

### 기타 API (Protected)
- `GET /api/statistics` - 내 통계
- `GET /api/export` - 내 데이터 내보내기
- `POST /api/upload` - 파일 업로드
- `POST /api/connections` - 추억 연결

### 공개 API
- `GET /api/categories` - 카테고리 목록

## 💻 샘플 데이터

### 10개의 고품질 사진 추억

1. **가족 여행 사진** - 제주도 풍경
2. **졸업식 영상** - 대학교 졸업
3. **할머니의 편지** - 손편지
4. **첫 취업 기념** - SNS 게시물
5. **반려동물 첫 만남** - 강아지
6. **친구들과의 모임** - 저녁 식사
7. **생일 파티** - 30번째 생일
8. **일몰 풍경** - 바닷가
9. **커피 한잔의 여유** - 카페
10. **산책길** - 가을 공원

모든 이미지는 Unsplash의 고품질 무료 이미지입니다.

## 🎨 UI/UX 특징

### 로그인 화면
- 그라데이션 배경
- 깔끔한 카드 디자인
- 로그인/회원가입 전환

### 메인 앱
- 상단 헤더에 사용자 정보
- 프로필 아바타 표시
- 로그아웃 버튼
- 반응형 네비게이션

### 추억 카드
- 이미지 썸네일
- 감정 이모지
- 중요도 별점
- 카테고리 뱃지

## 🛠️ 개발 환경

### 로컬 개발

```bash
# 프로젝트 디렉토리
cd /home/user/memorylink

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 샘플 데이터 삽입
npm run db:seed

# 사진 데이터 추가
npx wrangler d1 execute memorylink-production --local --file=./seed_auth.sql

# 빌드
npm run build

# PM2로 시작
pm2 start ecosystem.config.cjs

# 서비스 확인
curl http://localhost:3000
```

### 유용한 명령어

```bash
# PM2 관리
pm2 list
pm2 logs memorylink --nostream
pm2 restart memorylink

# 데이터베이스
npm run db:reset  # DB 초기화 및 재시드

# 포트 정리
npm run clean-port

# 로그인 테스트
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@memorylink.com","password":"password123"}'
```

## 🚀 프로덕션 배포

### 1. Cloudflare API 키 설정
```bash
# setup_cloudflare_api_key 도구 사용
```

### 2. D1 데이터베이스 생성
```bash
npx wrangler d1 create memorylink-production
# database_id를 wrangler.jsonc에 업데이트
```

### 3. 마이그레이션 적용
```bash
npm run db:migrate:prod
```

### 4. 초기 데이터 삽입 (옵션)
```bash
npx wrangler d1 execute memorylink-production --file=./seed.sql
npx wrangler d1 execute memorylink-production --file=./seed_auth.sql
```

### 5. 배포
```bash
npm run deploy:prod
```

### 6. 환경 변수 설정 (옵션 - AI 기능용)
```bash
npx wrangler pages secret put OPENAI_API_KEY --project-name memorylink
```

## 📝 기술 스택

- **프레임워크**: Hono 4.x
- **런타임**: Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **인증**: 세션 기반 (쿠키)
- **해싱**: Web Crypto API (SHA-256)
- **AI**: OpenAI GPT-3.5 (옵션)
- **스토리지**: Cloudflare R2 (옵션)
- **프론트엔드**: Vanilla JS, TailwindCSS, Font Awesome
- **빌드**: Vite 6.x
- **프로세스**: PM2

## 📊 버전 히스토리

### v3.0 (2025-12-13) - 인증 시스템 완비
- ✅ 회원가입/로그인 시스템
- ✅ 세션 기반 인증
- ✅ 사용자별 데이터 격리
- ✅ 10개 고품질 샘플 사진
- ✅ 비밀번호 보안 강화
- ✅ 권한 검증 미들웨어

### v2.0 (2025-12-13) - 프로덕션 레디
- 파일 업로드, AI 분석, 타임라인, 내보내기

### v1.0 (2025-12-13) - 초기 릴리스
- 기본 CRUD, 대시보드, 카테고리

## 🎯 주요 개선 사항 (v2.0 → v3.0)

### 보안
- 사용자 인증 시스템 추가
- 세션 관리 및 쿠키 보안
- 비밀번호 해싱
- API 권한 검증

### 데이터
- 사용자별 데이터 완전 격리
- 소유권 검증
- 세션 테이블 추가

### UX
- 로그인/회원가입 화면
- 사용자 프로필 표시
- 로그아웃 기능
- 인증 상태 관리

### 샘플 데이터
- 10개 실제 사진 추가
- 다양한 테마와 카테고리
- 고품질 Unsplash 이미지

## 🔧 환경 변수

### .dev.vars (로컬 개발)
```bash
# OpenAI API 키 (선택사항)
OPENAI_API_KEY=sk-your-api-key-here
```

### Cloudflare Pages Secrets (프로덕션)
```bash
# OpenAI API 키 설정
npx wrangler pages secret put OPENAI_API_KEY --project-name memorylink
```

## 🐛 문제 해결

### 로그인 안 됨
- 이메일과 비밀번호 확인
- 회원가입 먼저 진행
- 쿠키 허용 확인

### 데이터가 안 보임
- 로그인 상태 확인
- 세션 만료 시 재로그인
- 브라우저 콘솔 에러 확인

### AI 분석 안 됨
- `.dev.vars`에 OpenAI API 키 설정
- API 키 유효성 확인
- 크레딧 잔액 확인

### 데이터베이스 초기화
```bash
npm run db:reset
npx wrangler d1 execute memorylink-production --local --file=./seed_auth.sql
pm2 restart memorylink
```

## 📂 프로젝트 구조

```
memorylink/
├── src/
│   └── index.tsx          # 메인 앱 (인증 + API + Frontend)
├── migrations/
│   ├── 0001_initial_schema.sql  # 초기 스키마
│   └── 0002_add_auth.sql        # 인증 시스템
├── public/
│   └── static/            # 정적 파일
├── .wrangler/             # 로컬 D1 DB
├── .dev.vars.example      # 환경 변수 예제
├── ecosystem.config.cjs   # PM2 설정
├── wrangler.jsonc         # Cloudflare 설정
├── seed.sql               # 기본 시드 데이터
├── seed_auth.sql          # 사진 및 인증 데이터
├── package.json
└── README.md
```

## 🎊 특별한 기능

### 자동 아바타 생성
- UI Avatars API 사용
- 사용자 이름 기반
- 보라색 배경 (#667eea)

### 세션 자동 연장
- 로그인 상태 유지
- 7일 자동 만료
- 만료 시 자동 로그아웃

### 사용자별 통계
- 개인 추억만 집계
- 카테고리별 분포
- 감정 분석 통계

## 🌟 사용 시나리오

### 개인 디지털 일기장
1. 회원가입 후 로그인
2. 매일의 순간을 사진과 글로 기록
3. AI가 자동으로 요약하고 감정 분석
4. 타임라인으로 인생 회고

### 가족 추억 보관소
1. 가족 구성원 각자 계정 생성
2. 각자의 관점에서 추억 기록
3. 중요한 순간들 별점 표시
4. 데이터 내보내기로 영구 보존

### 여행 기록 관리
1. 여행 사진과 경험 업로드
2. 카테고리로 여행지별 정리
3. 타임라인으로 여정 확인
4. 감정 분석으로 하이라이트 발견

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Claude + 사용자 협업 프로젝트

---

**완전한 인증 시스템을 갖춘 실사용 가능한 디지털 유품 관리 서비스입니다! 🎉**

**지금 바로 회원가입하고 당신의 소중한 추억을 안전하게 보관하세요!**
