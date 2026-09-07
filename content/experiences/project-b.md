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

챌린지의 ‘하찮음’을 작고 귀여운 즐거움으로 해석했습니다. 반려견을 배경화면과 SNS에 공유하는 모습에 주목했고, 광고의 3B 법칙 중 동물(Beast)을 소재로 쓰는 방식에서도 아이디어를 얻었습니다.

모바일 화면에서는 ‘만나기 → 모아 보기 → 내 강아지 꾸미기’가 자연스럽게 이어지도록 구성했습니다.

![강아지 만나기 · 홈](/media/experiences/project-b/home.png 'gallery')

![모아 보기 · 강아지 앨범](/media/experiences/project-b/album.png 'gallery')

**Technical Decision**

꾸미는 동안 결과를 확인하러 다시 위로 올라가지 않도록, 큰 미리보기가 사라지면 상단에 작은 미리보기를 띄웠습니다. 두 화면이 같은 꾸미기 상태를 공유해, 귀·털색·소품을 바꾸면 함께 갱신되도록 했습니다.

API 응답을 모킹한 통합 테스트에는 등록 후 화면 전환과 요청 실패 시 재시도 시나리오를 담았습니다.

![꾸미기 시작 · 큰 미리보기](/media/experiences/project-b/customize-start.png 'gallery')

![스크롤 후 · 상단 고정 미리보기](/media/experiences/project-b/customize-scrolled.png 'gallery')

[미리보기 전환 코드와 테스트 사례](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/dog-preview-decision.md)

## 성과

- **홍보 첫날 120명 유입:** 에브리타임 자유게시판 게시글 1개와 댓글 5개로 서비스를 알렸습니다.
- **사진에서 꾸미기까지 연결:** 브라우저의 Canvas로 사진을 축소·JPEG 변환하고, 픽셀 색상으로 기본 털색을 제안했습니다. 외부 AI 호출 없이 기본 모습을 만들고, 사용자가 직접 바꾸도록 했습니다.
- **제작부터 홍보까지 전담:** 기획·디자인·개발·배포를 맡고, 홍보와 사용자 모집까지 직접 진행했습니다.
