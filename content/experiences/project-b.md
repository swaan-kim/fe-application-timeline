---
title: 앱인토스 ‘옆집 강아지’
category: build
technologies: [react, typescript, vitejs]
# 2026년 8월부터 진행 중. endDate는 종료일이 아닌 현재 타임라인 표시 기준일입니다.
startDate: '2026-08-01'
endDate: '2026-09-03'
ongoing: true
status: draft
---

## 목적

내 강아지를 꾸미고 자랑하며, 다른 강아지도 만나볼 수 있는 작은 서비스를 만들고자 했습니다. AI 스터디 과제로 앱인토스 [‘하찮아도 괜찮아’ 챌린지](https://toss.im/apps-in-toss/blog/2608_vibecoding_challenge)에 참여하며 시작했습니다.

## 의도

챌린지의 ‘하찮음’을 작고 귀여운 즐거움으로 해석했습니다. 반려견을 배경화면과 SNS에 공유하는 모습, 광고의 3B 법칙 중 동물(Beast)이 관심을 끈다는 점에서 소재를 떠올렸습니다.

모바일 화면에서는 ‘만나기 → 모아 보기 → 내 강아지 꾸미기’가 자연스럽게 이어지도록 구성했습니다.

![강아지 만나기 · 홈](/media/experiences/project-b/home.png 'gallery')

![모아 보기 · 강아지 앨범](/media/experiences/project-b/album.png 'gallery')

**Technical Decision**

꾸미는 동안 결과를 보려고 위아래로 오가지 않도록, 큰 미리보기가 화면 밖으로 사라지면 상단에 작은 미리보기를 띄웠습니다. 두 미리보기가 같은 꾸미기 상태를 사용해 귀·털색·소품 변경이 함께 반영되도록 했습니다.

![꾸미기 시작 · 큰 미리보기](/media/experiences/project-b/customize-start.png 'gallery')

![스크롤 후 · 상단 고정 미리보기](/media/experiences/project-b/customize-scrolled.png 'gallery')

[미리보기 전환 코드와 테스트 사례](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/dog-preview-decision.md)

## 성과

- **사용자 120명 확보:** 에브리타임 자유게시판 게시글 1개와 댓글 5개로 서비스 유입을 만들었습니다.
- **브라우저 기반 사진 처리 구현:** Canvas로 사진을 축소·JPEG 변환하고, 픽셀 색상을 분석해 기본 털색을 제안했습니다. 외부 AI 호출 없이 사진 등록에서 사용자가 직접 꾸미는 화면까지 연결했습니다.
- **기획부터 사용자 모집까지 직접 진행:** 기획·디자인·개발·배포에 이어 홍보까지 맡아, 서비스를 만드는 것뿐 아니라 사람들에게 알리고 사용으로 연결하는 과정도 경험했습니다.
