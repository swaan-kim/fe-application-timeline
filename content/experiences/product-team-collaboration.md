---
title: 미래에셋 챗봇
category: work
# 2026년 8월부터 진행 중. endDate는 종료일이 아닌 현재 타임라인 표시 기준일입니다.
startDate: '2026-08-01'
endDate: '2026-09-03'
ongoing: true
status: draft
---

## 목적

[미래에셋증권 AI Festival](https://miraeassetfesta.com/)에서 팀 리드를 맡았습니다. 공시를 근거로 답변하는 챗봇을 만들고, 팀원이 답변과 근거를 직접 검증할 수 있는 웹 화면을 구현하고자 했습니다.

## 의도

팀원들이 같은 기준으로 답변을 확인하고, 같은 양식으로 오류를 남길 수 있도록 QA 형식을 정리하고자 했습니다. ‘답변이 이상하다’는 의견을 구체적인 기록으로 바꿔, 수정 후에도 같은 조건으로 다시 확인할 수 있게 하는 것이 목표였습니다.

![공시 질문을 입력하는 웹 QA 화면](/media/experiences/product-team-collaboration/web-qa.png)

**Technical Decision**

질문·답변·공시 근거를 대조하는 화면에 오류 제보 양식을 함께 넣었습니다. 잘못된 값·단위·기간과 실행 버전을 항목별로 남겨, 다른 팀원도 같은 문제를 다시 확인할 수 있도록 했습니다.

검토할 때는 답변과 공시 근거를 먼저 보고, 필요한 경우 검색·계산 과정을 펼쳐 확인하도록 했습니다. 응답을 기다리는 동안에는 중복 요청을 막고 진행 상태를 표시했습니다.

챗봇 내부에서는 AI가 근거를 선택하고 설명을 작성하되, 값의 검증과 계산은 코드가 맡도록 파이프라인을 나눴습니다.

![공시 AI 에이전트 · 파이프라인 아키텍처](/media/experiences/product-team-collaboration/architecture.png)

## 성과

공시 챗봇과 웹 QA 화면을 구축하고, 총 69개의 QA 세트를 구성해 검증을 진행했습니다. 24개 질문 유형별 골든셋과 팀원의 자유 질문을 함께 활용해, 오류를 기록하고 수정 후 다시 확인하는 절차를 마련했습니다.

[웹 QA 화면 보기](http://101.79.16.190/team-test)

![공시 AI Agent 프로젝트 개요와 설계 문서](/media/experiences/product-team-collaboration/project-overview.png)
