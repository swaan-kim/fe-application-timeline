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

AX 해커톤에서 PPT 제작 워크플로우로 수상한 뒤, AI로 만든 발표자료의 배치 문제를 더 살펴봤습니다. 문구와 디자인을 여러 번 고쳐도 전체 배치를 일관되게 유지할 방법을 찾고자 했습니다.

**기존 문제 · 제목과 본문 겹침**

두 줄 카드 제목과 본문 첫 줄이 겹쳐 읽기 어려웠습니다. 원본 코드가 없어 원인을 단정할 수는 없지만, 높이와 시작 위치를 고정한 배치가 줄바꿈을 반영하지 못할 때 이런 겹침이 생길 수 있습니다.

![기존 슬라이드 · 제목과 본문이 겹치는 배치](/media/experiences/interaction-prototype/layout-overlap-before.png)

## 의도

요소별 좌표를 직접 지정하는 PPTX 생성 방식보다, 콘텐츠와 공통 배치 규칙을 나누기 쉬운 HTML·CSS를 수정 원본으로 선택했습니다.

**Technical Decision**

- **Flex/Grid로 배치 관계 정의:** 카드 열은 Grid로 나누고, 내부 제목과 본문은 세로 Flex로 쌓았습니다. 텍스트 높이와 간격이 다음 요소의 배치에 반영되도록 했습니다.
- **AI가 고칠 범위 분리:** 문구는 데이터, 배치는 공통 템플릿, 색·글꼴은 CSS로 관리했습니다. 문구 수정이 배치 재작성으로 번지지 않고, 디자인 수정은 공통 규칙에 반영되도록 했습니다.

**PDF에서도 같은 화면을 보여주려면**

HTML도 고정된 슬라이드 크기에서는 내용이 넘칠 수 있습니다. 폰트·이미지 로딩을 확인하고 애니메이션을 최종 상태로 맞춘 뒤, Playwright로 지정 요소의 넘침과 텍스트 잘림을 검사하고 캡처했습니다.

캡처를 이미지형 PDF로 묶어 발표 화면의 모양을 유지했습니다. 텍스트 선택·검색·편집은 제한되므로, 최종 화면을 전달하는 용도로 선택했습니다.

## 성과

다음 발표자료에도 같은 과정을 적용할 수 있도록 기획·제작·검수·PDF 출력을 AI 제작 스킬로 정리했습니다. [레이아웃·PDF 출력 설계와 실제 코드](https://github.com/swaan-kim/fe-application-timeline/blob/main/docs/evidence/ppt-export-decision.md)

![슬라이드 전환 시연](/media/experiences/interaction-prototype/slide-demo.gif)

![학습 데이터 설명 슬라이드](/media/experiences/interaction-prototype/training-data.png)

![제품 화면 설명 슬라이드](/media/experiences/interaction-prototype/product-history.png)
