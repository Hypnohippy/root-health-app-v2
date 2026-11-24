# PR #70 — Fictional Voice Coach recording plan

Status: plan only. No recording exists yet, and no provider session or billable capture has been made.

## Purpose

Create one reusable, clearly labelled prerecorded walkthrough of the genuine Root Voice Coach using an authorised test grant and fictional Personal Root data. It should demonstrate a consultative conversation, development of an intervention, the coach's offer to save it, the participant's explicit consent, and confirmation only after the Playbook save succeeds. It must not imply that playback is a live or interactive consultation.

## Controlled capture

1. Wait until isolated Preview migrations, identity, monthly budget policy, grant controls, session termination and direct access checks have passed.
2. Obtain separate approval for one genuine provider session and screen/audio recording. The app reservation must be approved before the session starts.
3. Use only a Root-created fictional test account and invented wellbeing facts. Do not use an introducer's or customer's health history, speech, account, organisation, email, browser session, or production data.
4. Prewrite the short scenario and stopping points so the capture fits the approved allocation. Demonstrate explicit consent and verify the Playbook write before recording the completion message.
5. Capture screen and audio once. Do not generate new voice or video content for each playback. Never capture secret keys, access tokens, participant identifiers, browser address tokens, or admin screens.
6. Review the complete file for accidental personal information, unsaved claims, transcript leakage, and interrupted action. Re-record only with separate approval and a fresh budget reservation.
7. Store the approved media as the Preview-only static asset `public/introducer/voice-coach-demo.mp4`. The introducer page probes that exact static path and only then renders a native video player. Show a persistent label: “Prerecorded demonstration · fictional data · not a live consultation.” Keep the synthetic scenario and fictional identity visible; watermark the presentation without claiming to prevent copying.
8. Playback must only fetch the static approved asset. It must not call OpenAI, transcription, or any other inference API. Record an asset hash and approval date for later replacement/revocation.

## Acceptance checks

- Confirm the clip shows the genuine Root interface and Playbook workflow.
- Confirm the saved Playbook item exists in the isolated test account before showing “saved”.
- Verify replay and refresh cause no provider requests and no budget reservations.
- Verify the label remains visible on desktop and mobile.
- Verify the asset contains no real customer or employee data and no credential-bearing URL.

## Remaining action

A Root-approved, budget-reserved Preview test session and separate recording approval are required before producing or publishing the clip. Keep live Voice disabled until that session also passes the termination and recovery acceptance checks.
