---
title: 미래에셋 챗봇
category: work
technologies: [javascript, python, fastapi]
# 2026년 8월부터 진행 중. endDate는 종료일이 아닌 현재 타임라인 표시 기준일입니다.
startDate: '2026-08-01'
endDate: '2026-09-03'
ongoing: true
status: draft
---

## 목적

[미래에셋증권 AI Festival](https://miraeassetfesta.com/)에서 팀 리드를 맡았습니다. 공시 기반 챗봇을 만들고, 팀원이 답변의 근거와 오류를 직접 확인할 수 있는 웹 QA 화면을 구현했습니다.

## 의도

‘답변이 이상하다’는 의견을 ‘어떤 값이 어떻게 다른가’로 구체화하고자 했습니다. QA 기록 형식을 맞춰, 다른 팀원도 오류를 재현하고 수정 후 같은 조건으로 확인할 수 있게 하는 것이 목표였습니다.

![공시 질문을 입력하는 웹 QA 화면](/media/experiences/product-team-collaboration/web-qa.png)

**Technical Decision**

질문·답변·공시 근거를 한 화면에 두고, 오류를 바로 기록하도록 구성했습니다. 값·단위·기간과 실행 버전을 항목별로 남겨, 다른 팀원도 확인할 조건을 찾을 수 있게 했습니다.

답변과 공시 근거를 먼저 보여주고, 검색·계산 과정은 필요할 때 펼쳐 보도록 했습니다. 응답 대기 중에는 진행 상태를 표시하고 중복 요청을 막았습니다.

AI의 설명과 계산 결과를 따로 검증할 수 있도록, 근거 선택·설명은 AI가 맡고 값의 검증·계산은 코드가 맡도록 나눴습니다.

![공시 AI 에이전트 · 파이프라인 아키텍처](/media/experiences/product-team-collaboration/architecture.png)

## 성과

- **챗봇과 웹 QA 화면 구축:** 총 69개의 QA 세트를 구성해 검증을 진행했습니다.
- **QA 절차 정립:** 24개 질문 유형별 골든셋과 팀원의 자유 질문을 활용해, 오류 기록부터 수정 후 재확인까지 절차를 마련했습니다.

[웹 QA 화면 보기](http://101.79.16.190/team-test)

![공시 AI Agent 프로젝트 개요와 설계 문서](/media/experiences/product-team-collaboration/project-overview.png)
