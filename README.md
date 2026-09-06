# FE Application Timeline

경험을 `Build / Work / Grow`로 빠르게 훑고, 각 경험의 `목적 / 의도 / 성과`를 독립된 문서로 읽는 프론트엔드 지원서입니다.

면접관이 첫 화면에서 경험의 분류와 시간 흐름을 파악한 뒤 필요한 항목만 자세히 읽도록 설계했습니다. 홈에는 날짜와 제목만 두고, 상세 페이지에는 판단을 설명하는 세 문단만 남깁니다. 카드, 배지, 자동재생, 가짜 수치와 장식용 문구는 사용하지 않습니다.

데스크톱과 모바일은 같은 경험 목록을 사용합니다. 768px 미만에서는 그래프를 접고 분류 제목 아래 날짜·제목을 세로로 배치합니다. 화면 크기가 바뀌어도 읽던 항목이 유지되며, 상세에서 돌아오면 해당 행으로 포커스를 복원합니다.

타임라인 제목과 막대 전체는 하나의 링크입니다. 제목은 말줄임 없이 표시하고 트랙 높이가 글줄에 맞춰 늘어납니다. 키보드 사용자는 ‘경험 목록으로 건너뛰기’로 반복 탐색을 줄일 수 있습니다. 상세 하단의 다음 경험은 홈과 같은 분류·최신순을 따르며 마지막 항목에서 순환하지 않습니다.

## 콘텐츠 편집

경험 하나는 `content/experiences/<slug>.md` 파일 하나입니다. 파일을 추가하거나 삭제하면 타임라인, 분류별 목록, 상세 URL이 함께 갱신됩니다. 게시한 파일명은 URL이 되므로 이후 바꾸지 않습니다.

```md
---
title: '경험 제목'
category: build
startDate: '2026-03-09'
endDate: '2026-08-21'
status: draft
---

## 목적

누구의 어떤 문제를 해결하려 했는지 작성합니다.

## 의도

어떤 판단 기준과 선택을 적용했는지 작성합니다.

## 성과

확인된 변화, 산출물 또는 검증 결과를 작성합니다.
```

- `category`: `build`, `work`, `grow`
- `status`: `draft`, `published`, `archived`
- `endDate`가 없으면 단일 사건으로 표시
- 화면의 날짜는 월 단위(`2026.06 — 2026.08`)로 표시합니다. 같은 달에 끝난 경험은 월을 한 번만 표시합니다. 일자는 타임라인 배치용으로만 사용하며 초·후반 정도의 근사치를 넣을 수 있습니다.
- 진행 중인 경험에는 `ongoing: true`와 타임라인 표시 기준일까지의 `endDate`를 함께 넣습니다. 화면에는 종료 월 대신 `현재`가 표시됩니다. 기준일 변경 시 이 `endDate`도 갱신하고, 활동이 끝나면 `ongoing`을 제거하거나 `false`로 바꾸고 종료 월에 맞는 날짜를 넣습니다.
- 본문: 문단, 순서·비순서 목록, 굵게, 기울임, `http`·`https`·`mailto` 링크만 허용

개발 화면에서는 `draft`도 보이며, 프로덕션 빌드는 기본적으로 `published`만 포함합니다. 예외적으로 작성 중인 내용을 그대로 공개하려면 `application.config.ts`의 `publicDraftIds`에 해당 파일 ID를 명시합니다. 현재 여섯 초안은 2026-09-06 사용자 승인에 따라 모두 공개하며, 빈 항목의 상세에는 기존 ‘초안 · 내용 작성 전’ 표시가 유지됩니다. 새 초안은 자동 공개하지 않고, `archived`는 승인 목록에 있어도 배포에서 제외합니다. `published` 상태에는 여전히 빈 문단과 목업 문구 검사가 적용됩니다.

이름, 지원 분야, 12개월 기준일과 GitHub 프로필은 `src/content/application.config.ts`에서 한 번만 관리합니다. GitHub은 `https://github.com/<username>` 형식의 프로필 주소만 허용하며, 비어 있으면 개발 화면에서 숨기고 게시 검사는 실패합니다.

표의 표시 시작일은 같은 파일의 `chartStartDate`로 별도 지정합니다. 현재는 `2026-03-01`부터 9월 기준일까지 표시합니다. 막대만 표시 범위에 맞춰 자르고 목록·상세의 실제 날짜와 콘텐츠 검증 범위는 유지합니다. 따라서 2025년 10월부터 이어진 학습도 시작일을 바꾸지 않고 표에 넣을 수 있습니다. 표시 범위 밖에서 끝난 경험은 표에서만 제외됩니다.

상단 표에만 넣는 활동은 같은 설정의 `chartAnnotations`에서 관리합니다. `id`, `category`, `title`, `startDate`, 선택적 `endDate`, `chartOnly: true`를 지정하며 날짜·분류·중복 ID를 검사합니다. 이 항목은 하단 목록·상세 경로·다음 경험 순서에 포함하지 않고 클릭 링크도 만들지 않습니다. 기존 반응형 정책에 따라 표가 숨겨지는 모바일에서는 표시하지 않습니다. 현재 `NCP AI Enablement 팀 PT`는 Work의 2026년 3~6월에 해당합니다.

홈에는 날짜와 제목만 노출되므로 게시 제목은 문제나 기여가 드러나는 8–24자를 권장합니다. 36자를 넘거나 `프로젝트 B`, `협업`, `학습`처럼 단독으로 의미가 불분명한 게시 제목은 차단합니다.

기준일을 옮길 때 과거 기록은 먼저 `archived`로 바꾸면 됩니다. 모든 파일의 날짜 형식과 기간 순서는 검사하지만 보관 기록에는 현재 12개월 범위를 강제하지 않습니다. 초안은 개발 화면에 노출될 때만 범위를 검사합니다. `content:check`와 `content:publish-check`는 파일·필드별 오류를 모아 표시하므로 설정과 본문을 함께 수정할 수 있습니다.

## Notion에서 작성하기

Notion은 편집 입력 수단이고 Markdown이 최종 원본입니다. 가져오기는 항상 미리보기와 명시적 반영 두 단계로 실행합니다.

```bash
npm run content:notion:pull
npm run content:notion:pull -- --apply --run <미리보기 ID>
```

첫 명령은 `.content-sync/`에 검토 후보와 변경 요약만 만들며 실제 Markdown은 건드리지 않습니다. Markdown과 Notion이 모두 바뀐 항목은 충돌로 중단합니다. 설정할 속성, 페이지 템플릿과 비밀키 연결 방법은 [Notion 설정 문서](docs/notion-template.md)를 참고합니다.

## 구조

```text
content/experiences/          사람이 편집하는 경험별 Markdown
build/                        Markdown 검증과 빌드 전용 로더
scripts/notion/               Notion 변환·충돌 감지·반영
src/domain/                   날짜·배치·공개 검증 규칙
src/features/                 홈 타임라인과 상세 문서
  application-timeline/
    TimelineChart.tsx         날짜 축과 기간·사건 표시
    chartLayout.ts            제목 공간을 고려하는 시각 배치
    ExperienceList.tsx        모든 화면에서 공유하는 경험 목록
    experienceNavigation.ts   돌아오기와 키보드 포커스
e2e/                          반응형·경로·키보드·접근성 검증
```

공개 브라우저에는 게시 항목과 명시적으로 공개 승인한 초안만 전달합니다. 미승인 초안·보관 본문, Notion 토큰과 API 응답은 공개 번들에 들어가지 않습니다. 단, 공개 GitHub 저장소에 커밋한 Markdown은 웹사이트 노출 상태와 무관하게 누구나 읽을 수 있습니다. 비공개 메모와 자격증명은 저장소에 넣지 않습니다. 타임라인의 막대는 실제 날짜 비율을 유지하며, 제목과 클릭 영역은 별도 공간을 확보해 짧은 활동도 선택할 수 있습니다.

홈에서 Markdown 렌더러를 내려받지 않도록 상세 화면을 지연 로딩합니다. 실패 시 목록으로 돌아가거나 명시적으로 재시도할 수 있습니다. WebKit의 실패한 모듈 캐시에도 재시도할 수 있도록 빌드가 제공한 실제 chunk URL을 사용하며, 임시 재시도 query는 성공 후 제거합니다. 일반 진입에서는 React의 기본 lazy import를 사용합니다.

## 실행과 검증

```bash
npm install
npm run dev
npm run check
npm run build
npm run test:e2e
npm run test:release
```

- `npm run check`: 콘텐츠 구조, 타입, 린트, 포맷, 단위·컴포넌트 테스트
- `npm run build`: 공개 승인된 콘텐츠만 빌드하고 결과의 목록·상태·본문 해시를 재검증
- `npm run content:publish-check`: Build / Work / Grow마다 게시 항목 또는 명시적으로 공개 승인한 초안이 있는지 확인
- `npm run test:e2e`: 사용자 Markdown과 독립된 9개 경험으로 1440·1024·768·390·320px, 직접 URL, 키보드, 확대, reduced motion와 axe 검사. 최초 실행 전 `npx playwright install chromium firefox webkit`이 필요합니다.
- `npm run test:release`: 격리된 공개 가능 콘텐츠로 실제 프로덕션 빌드를 수행하고 JS·HTML·소스맵에서 고유한 초안·보관 본문이 제외되는지 검사합니다. 사용자 콘텐츠나 배포용 `dist/`는 수정하지 않습니다.

배포 결과는 `dist/`, 고정된 검증용 콘텐츠의 테스트 결과는 `dist-qa/`로 분리됩니다. 공개 검사에서는 실제로 빌드에 사용된 콘텐츠의 목록·상태·해시를 확인해 테스트 결과나 오래된 콘텐츠를 차단합니다. 일반 단어가 초안 파일명에 포함돼도 오탐하지 않습니다. 경험 Markdown의 추가·수정·삭제는 개발 화면에 자동 반영됩니다.

브라우저 캡처와 격리된 공개 빌드는 작업 공간의 `work/qa/`에 둡니다. 글자 크기 200%와 실제 브라우저 확대 200%는 별도로 검사합니다. 실제 확대 검사는 [Playwright의 격리된 확장 테스트 방식](https://playwright.dev/docs/chrome-extensions)과 [Chrome tabs.setZoom](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom)을 사용하며 사용자 브라우저 설정은 바꾸지 않습니다. 자동 접근성 검사만으로 접근성이 완결되지는 않으므로 실제 읽기·키보드 확인을 병행합니다.

공개 저장소에는 전화번호, 생년월일, 학번 등 지원 과정에 불필요한 개인정보를 넣지 않습니다. 정적 SPA fallback은 Sites와 Vercel 양쪽에 설정되어 있습니다.

## Vercel 배포와 수정

Vercel은 Vite 프로젝트로 구성하며 빌드 명령은 `npm run build`, 출력 폴더는 `dist`입니다. `/experiences/<slug>`로 직접 들어오거나 새로고침해도 열리도록 `vercel.json`에 SPA 경로 처리를 둡니다. `BASE_URL`은 `/`를 사용합니다.

GitHub 저장소의 `main`을 Vercel Production Branch에 연결하면 이후 커밋을 push할 때마다 새 버전이 배포됩니다. 면접관에게는 임시 Preview URL이 아닌 고정 Production 도메인을 공유합니다. 새 배포가 성공하면 같은 주소가 최신 버전을 가리키므로 링크를 다시 보낼 필요가 없습니다. 공유 전 로그아웃 상태에서도 홈과 상세가 열리는지 확인합니다.

GitHub Pages 워크플로는 수동 실행만 유지하며, Vercel 배포와 동시에 자동 실행하지 않습니다. `.vercel`, `.openai`, `.env*`(빈 `.env.example` 제외), 임시 결과와 기존 로컬 Git 이력은 공개 소스에서 제외합니다. GitHub 저장소의 코드를 수정한 경우 기존 작업 폴더와 먼저 동기화한 뒤 배포합니다.
