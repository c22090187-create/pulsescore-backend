# PULSE SCORE 백엔드 (테스트용)

프론트엔드(펄스스코어 화면)가 스포츠 API를 직접 부르지 않고, 이 서버를 통해서만
데이터를 받아오도록 만든 중간 서버입니다. (API 키를 숨기고, 같은 데이터를
여러 사용자에게 재사용시켜서 API 호출 횟수를 아끼기 위함입니다.)

터미널을 거의 쓰지 않고 배포할 수 있도록 순서를 정리했습니다. 하나씩만
따라오시면 됩니다.

---

## 0단계. 지금 이 폴더에 뭐가 들어있나요?

```
pulsescore-backend/
├── api/
│   ├── scores.js       ← 실제로 호출하게 될 주소 (/api/scores)
│   ├── _apisports.js   ← API-Sports 호출 도우미 (직접 수정 안 하셔도 됩니다)
│   └── _cache.js        ← 아주 단순한 캐시 (직접 수정 안 하셔도 됩니다)
├── package.json
├── .env.example         ← API 키를 넣는 위치의 "샘플" 파일
├── .gitignore
└── README.md             ← 지금 보고 계신 파일
```

Vercel은 `api/` 폴더 안의 파일을 자동으로 서버 함수로 인식합니다. 그래서
별도 서버 설정 파일이 필요 없습니다.

---

## 1단계. API-Sports 무료 키 발급받기

1. https://dashboard.api-football.com/register 에서 무료 회원가입
2. 로그인하면 대시보드에 **API Key**가 바로 보입니다. 그 값을 복사해두세요.
3. 무료 플랜은 하루 100회 요청까지 가능합니다. 테스트 단계에는 충분합니다.

> 축구(API-Football), 야구, 농구, 배구 모두 같은 API-Sports 계정과 키를
> 사용합니다. 종목별로 API를 따로 가입하실 필요는 없습니다.

---

## 2단계. GitHub에 이 폴더 올리기 (터미널 없이)

1. https://github.com 에서 무료 계정을 만드세요 (이미 있으면 로그인).
2. 오른쪽 위 **+** 버튼 → **New repository** 클릭.
   - Repository name: `pulsescore-backend` (원하는 이름으로 하셔도 됩니다)
   - Public/Private 아무거나 선택
   - **Create repository** 클릭
3. 만들어진 빈 저장소 화면에서 **uploading an existing file** 링크를 클릭.
4. 지금 이 폴더 안의 파일들을 전부(폴더 구조 그대로) 끌어다 놓으세요.
   - `.env.local` 파일은 아직 없으니 올릴 필요 없습니다. (`.env.example`만 올라가면 됩니다)
5. 아래 **Commit changes** 버튼 클릭.

---

## 3단계. Vercel에 배포하기

1. https://vercel.com 에서 **Continue with GitHub**로 가입/로그인.
2. 대시보드에서 **Add New → Project** 클릭.
3. 방금 만든 `pulsescore-backend` 저장소를 선택하고 **Import** 클릭.
4. 설정 화면에서 **Environment Variables** 항목을 펼쳐서:
   - Name: `API_SPORTS_KEY`
   - Value: 1단계에서 복사해둔 키
   - **Add** 클릭
5. **Deploy** 버튼 클릭. 1~2분 기다리면 배포가 끝납니다.
6. 배포가 끝나면 `https://pulsescore-backend-아무개.vercel.app` 같은 주소가 생깁니다.

---

## 4단계. 잘 되는지 테스트하기

브라우저 주소창에 아래처럼 입력해보세요 (본인 주소로 바꿔서):

```
https://pulsescore-backend-아무개.vercel.app/api/scores?sport=soccer&date=2026-09-20
```

아래와 비슷한 JSON이 뜨면 성공입니다:

```json
{
  "source": "live",
  "matches": [
    { "id": "12345", "league": "K리그1", "home": "FC 서울", "away": "울산 HD",
      "homeScore": 1, "awayScore": 1, "status": "2H", "elapsed": 67, "kickoff": "2026-09-20T10:00:00+00:00" }
  ]
}
```

- `sport`는 `soccer` / `baseball` / `basketball` / `volleyball` 중 하나
- `date`는 `YYYY-MM-DD` 형식

에러가 뜨면, Vercel 대시보드 → 프로젝트 → **Deployments** → 방금 배포 →
**Functions** 탭에서 에러 로그를 확인할 수 있어요. 대부분 `API_SPORTS_KEY`
환경변수를 빠뜨렸거나 오타가 원인입니다.

---

## 5단계. (다음 단계) 프론트엔드와 연결하기

지금 펄스스코어 화면(Claude에서 만든 미리보기 페이지)은 보안 정책상 이런
외부 서버로 직접 데이터를 요청할 수 없습니다. 그래서 실제로 이 데이터를
화면에 띄우려면, **프론트엔드 파일도 Vercel(또는 Netlify 등)에 함께
배포**해야 합니다.

이 부분은 백엔드가 정상적으로 동작하는 걸 확인하신 다음, 이어서 진행하면
됩니다 — 프론트엔드 코드에서 지금 "예시 데이터"로 채워둔 부분을
`fetch("https://내-백엔드-주소/api/scores?sport=soccer")` 호출로 바꾸는
작업이 필요합니다. 준비되시면 말씀해주세요.

---

## 참고: 비용

- API-Sports 무료 플랜: 하루 100회 요청, 비용 0원
- Vercel 무료 플랜(Hobby): 개인 프로젝트 기준 비용 0원
- 지금 단계에서 드는 돈은 **0원**입니다. 사용자가 늘어나서 무료 한도를
  넘어서는 시점부터 유료 전환을 고려하면 됩니다.
