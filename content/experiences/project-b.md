---
title: 앱인토스 ‘옆집 강아지’
category: build
# 2026년 8월부터 진행 중. endDate는 종료일이 아닌 현재 타임라인 표시 기준일입니다.
startDate: '2026-08-01'
endDate: '2026-09-03'
ongoing: true
status: draft
---

## 목적

AI 스터디 과제로 앱인토스 [‘하찮아도 괜찮아’ 챌린지](https://toss.im/apps-in-toss/blog/2608_vibecoding_challenge)에 참여했습니다.

## 의도

‘하찮음’을 작고 귀여운 즐거움으로 해석하고, 광고의 3B 법칙 중 동물(Beast)의 주목 효과에 착안해 반려견을 소재로 선택했습니다.

반려견을 배경화면과 SNS에 공유하는 모습에서 아이디어를 얻어, 내 강아지를 자랑하고 다른 강아지를 만나는 서비스를 기획·배포했습니다. 작은 모바일 화면에서도 ‘만나기 → 모아 보기 → 내 강아지 꾸미기’가 이어지도록 구성했습니다.

![강아지 만나기 · 홈](/media/experiences/project-b/home.png 'gallery')

![모아 보기 · 강아지 앨범](/media/experiences/project-b/album.png 'gallery')

**Technical Decision**

꾸미기 옵션을 내려 보다가 결과를 확인하려고 다시 위로 올라가는 흐름을 줄이기 위해, 큰 미리보기가 뷰포트를 벗어나면 상단 고정 미리보기로 전환했습니다. 두 미리보기가 같은 외형 상태를 전달받게 해 귀·털색·소품 변경을 즉시 확인하도록 했습니다.

![꾸미기 시작 · 큰 미리보기](/media/experiences/project-b/customize-start.png 'gallery')

![스크롤 후 · 상단 고정 미리보기](/media/experiences/project-b/customize-scrolled.png 'gallery')

- **화면과 조작 영역:** 고정 미리보기 폭·위치에 뷰포트와 토스 safe area를 반영하고, 터치 이벤트를 가로채지 않도록 했습니다.
- **탭과 드래그:** Pointer Events의 이동 임계값으로 둘을 구분해, 강아지를 옮긴 뒤 선택 동작이 중복 실행되지 않도록 했습니다.

[미리보기 전환 코드와 테스트 사례](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/dog-preview-decision.md)

## 성과

에브리타임 자유게시판 게시글 1개와 댓글 5개를 통해 사용자 120명을 확보했습니다.

챌린지 주제에 맞춘 기획·디자인·개발부터 홍보·세일즈까지 전 과정을 경험하며, 특히 서비스를 알리고 사용자를 모으는 경험을 쌓았습니다.
