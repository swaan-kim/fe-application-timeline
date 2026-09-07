---
title: AI로 PPT '잘' 만들기
category: build
technologies: [html5, css3, playwright]
# 타임라인 배치용 근사 날짜: 2026년 6월 후반부터 8월 초. 화면에는 월만 표시합니다.
startDate: '2026-06-21'
endDate: '2026-08-07'
status: draft
---

## 목적

AX 해커톤에서 PPT 제작 워크플로우로 수상한 뒤에도, AI로 만든 발표자료의 배치와 수정 과정이 아쉬웠습니다. AI와 여러 번 고쳐도 전체 디자인을 일관되게 유지할 방법을 찾고자 했습니다.

**기존 문제 · 제목과 본문 겹침**

두 줄로 표시된 카드 제목과 본문 첫 줄이 겹쳐, 내용을 읽기 어려웠습니다. 텍스트 영역의 높이와 다음 요소의 시작 위치를 따로 고정하면, 줄바꿈으로 늘어난 높이가 배치에 반영되지 않아 이런 겹침이 생길 수 있습니다.

![기존 슬라이드 · 제목과 본문이 겹치는 배치](/media/experiences/interaction-prototype/layout-overlap-before.png)

## 의도

PPTX를 직접 생성하기보다, AI와 반복 수정할 원본을 HTML·CSS로 두었습니다.

**Technical Decision**

- **FE · 좌표보다 배치 관계:** 카드는 Grid로 나누고, 카드 안의 제목과 본문은 Flex로 순서대로 쌓았습니다. 각 요소의 좌표를 다시 계산하기보다, 텍스트 높이와 간격에 따라 배치되도록 했습니다.
- **AI · 수정 범위를 명확하게:** 문구는 슬라이드 데이터, 배치는 공통 템플릿, 색·글꼴은 CSS로 분리했습니다. 문구를 고칠 때 배치까지 다시 만들지 않고, 디자인 변경은 공통 규칙에 반영하도록 했습니다.

**PDF에서도 같은 화면을 보여주려면**

HTML도 고정된 슬라이드 크기에서는 내용이 넘칠 수 있습니다. 폰트·이미지 로딩과 애니메이션의 최종 상태를 준비한 뒤, Playwright로 지정한 요소의 경계와 텍스트 잘림을 검사하고 슬라이드를 캡처했습니다.

캡처를 이미지형 PDF로 묶어 발표 화면의 모양을 유지했습니다. 텍스트 선택·검색과 편집은 제한되는 방식이라, 최종 화면을 전달하는 용도로 선택했습니다.

## 성과

다음 발표자료에도 같은 과정을 적용할 수 있도록 기획·제작·검수·PDF 출력을 AI 제작 스킬로 정리했습니다. [레이아웃·PDF 출력 설계와 실제 코드](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/ppt-export-decision.md)

![슬라이드 전환 시연](/media/experiences/interaction-prototype/slide-demo.gif)

![학습 데이터 설명 슬라이드](/media/experiences/interaction-prototype/training-data.png)

![제품 화면 설명 슬라이드](/media/experiences/interaction-prototype/product-history.png)
