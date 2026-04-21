# MVP Plan

## Phase 0: Foundation

- finalize stack decisions
- add core docs and compact agent guidance
- define schema and key entities
- define report contract

## Phase 1: Interview Core

- keep UI minimal and mostly stock shadcn components
- build admin template creation
- build candidate invite links
- build candidate preflight
- stand up LiveKit room creation and agent join flow
- create first interview script and follow-up logic
- persist transcript and session state in Convex

## Phase 2: Assessment Pipeline

- generate structured rubric output
- store evidence and recommendation
- run report generation in Inngest
- add confidence and manual-review flags

## Phase 3: Dashboard

- sessions list
- session detail page
- rubric charts with shadcn charts
- transcript and evidence viewer
- notes and review state

## Phase 4: Standout Feature

- add weak-student simulation mode
- score teaching adaptability and simplification separately
- surface this as a differentiated section in the report

## Core Entities

- `assessmentTemplates`
- `candidateInvites`
- `interviewSessions`
- `transcriptSegments`
- `assessmentReports`
- `reviewNotes`

## Success Criteria

- a candidate can complete a live voice interview end-to-end
- an admin can review a structured report in under two minutes
- each rubric dimension includes evidence
- the experience feels warm and polished rather than like a bot demo

## Build Order

1. admin creates a template
2. admin generates candidate link
3. candidate completes preflight
4. candidate joins live interview
5. transcript persists live
6. report generates after completion
7. admin reviews report and transcript

## Immediate Now

This is the work to do before any real UI polish:

1. install and wire the chosen realtime provider
2. define session schema and lifecycle states in Convex
3. create meeting-link or room-token creation flow
4. build a bare candidate join page with mic and connection checks
5. get one agent and one human talking in realtime
6. persist transcript chunks and session events
7. only then add scoring and review screens
