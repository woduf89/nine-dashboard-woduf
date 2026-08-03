# 9호선 기관사 앱

서울 9호선 기관사를 위한 실시간 열차 위치 + 간격 확인 + PDF 매뉴얼 검색 앱

## 기능

- **실시간 노선도** — 서울 오픈API 연동, 30초마다 자동 갱신
- **열차 간격** — 내 열차 기준 전방/후방 간격 (시간 + 역 수), 전체 열차 간격 현황
- **PDF 매뉴얼 검색** — 고장 조치 매뉴얼 PDF를 등록하면 키워드 검색 가능, IndexedDB에 영구 저장

## 배포 (Vercel)

### 1. 저장소 클론 후 Vercel 연결

```bash
git clone https://github.com/your-repo/line9-driver-app
cd line9-driver-app
vercel
```

### 2. 환경변수 설정

Vercel 대시보드 → Settings → Environment Variables

| 이름 | 값 |
|------|-----|
| `api_key` | 서울 열린데이터광장 발급 API 키 |

또는 CLI로:
```bash
vercel env add api_key
```

### 3. 배포

```bash
vercel --prod
```

## 프로젝트 구조

line9-driver-app/
├── index.html              # HTML 구조만 남긴 가벼운 메인 파일
├── css/
│   └── style.css           # 모든 <style> 태그 내용
└── js/
    ├── data/
    │   ├── stations.js     # STATIONS (노선 역 정보)
    │   └── diaMap.js       # DIA_MAP (운행 다이아 매핑 데이터)
    ├── modules/
    │   ├── map.js          # 실시간 노선도 및 렌더링 로직
    │   ├── gap.js          # 열차 간격 계산 및 간격 페이지 로직
    │   ├── dia.js          # 운행 다이아 조회 로직
    │   └── pdf.js          # PDF.js 연동, 검색 및 IndexedDB 로직
    └── app.js              # 앱 초기화(init) 및 메인 스크립트

## 동작 방식

1. 앱 실행 시 `/api/subway` 엔드포인트로 요청
2. Vercel 서버가 환경변수 `api_key`를 사용해 서울 API 호출
3. **API 성공** → 실시간 데이터로 노선도 업데이트 (30초 주기)
4. **API 실패** → 시뮬레이션 모드로 자동 전환 (헤더에 🟡 표시)

## 로컬 개발

```bash
# Vercel CLI 설치
npm i -g vercel

# 환경변수 포함해서 로컬 실행
vercel dev
```

`vercel dev` 실행 시 `.env.local` 파일을 자동으로 읽거나,
Vercel 프로젝트와 연결되어 있으면 환경변수를 자동으로 가져옵니다.

```
# .env.local (로컬 개발용, git에 올리지 마세요)
api_key=여기에_api키_입력
```
