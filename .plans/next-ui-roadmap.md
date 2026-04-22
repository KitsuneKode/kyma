# Kyma UI/UX Roadmap: The Next Level

Now that the core foundation, routing, typography, and primary dashboards are polished, the next UI focuses should tackle the **deep interactive experiences**. These are the areas where we can introduce the most "wow" factor and functional leverage.

Here is the proposed roadmap for the next best UI enhancements:

## 1. The Recruiter Review Console (The "Final Mile")

**The Challenge:** The recruiter needs to quickly ingest a 20-minute interview to make a hiring decision. If this screen is just a wall of text, cognitive load skyrockets.
**The UI Solution:**

- **Split-Pane Layout:** Transcript on the left, AI Rubric Analysis on the right.
- **Audio-Synced Transcript:** A persistent audio player at the bottom of the screen. As the audio plays, the transcript text highlights the active word/sentence.
- **AI Citation Highlighting:** When the recruiter clicks on a score (e.g., "Concept Simplification: 90/100"), the exact sentences in the transcript where the candidate demonstrated this skill briefly highlight/glow.

## 2. Dynamic AI Persona Visualization (During the Interview)

**The Challenge:** Staring at a blank screen or a generic avatar during a live AI interview feels unnatural for the candidate.
**The UI Solution:**

- Instead of a creepy 3D human, use a sophisticated **audio-reactive visualizer**.
- We can take the new "K-wave" abstract logo and animate it using `framer-motion` and LiveKit's audio volume hooks. When the AI speaks, the waves pulse and expand smoothly. When listening, it settles into a calm, breathing glow. This adds massive premium polish without heavy video assets.

## 3. Global Command Palette (CMD+K)

**The Challenge:** Navigating a SaaS application solely via clicks limits power users.
**The UI Solution:**

- Implement a global, keyboard-driven `Command` palette (using `shadcn/ui`).
- Instantly jump to specific candidates (e.g., typing "Aarav" pulls up his report).
- Trigger actions from anywhere (e.g., "Create Screening", "Open BYOK Settings").
- Use micro-animations to slide the palette in seamlessly over the blurred background.

## 4. Rich Feedback Notifications & Toasts

**The Challenge:** Standard success/error messages are easily ignored.
**The UI Solution:**

- Integrate `Sonner` (the standard for premium toast notifications).
- Add contextual actions inside toasts (e.g., "Screening Batch Created" -> `[Copy Invite Link]` button right inside the toast).
- Smooth entry/exit animations mapped exactly to our `[0.23, 1, 0.32, 1]` cubic-bezier.

## 5. Contextual Skeleton Dissolves

**The Challenge:** Hard-flashing from a skeleton loader to data feels disjointed.
**The UI Solution:**

- Instead of standard pulse animations that instantly disappear, we implement a "dissolve" transition. The skeleton frame smoothly cross-fades into the actual loaded data, maintaining spatial consistency so the user's eye doesn't have to readjust.
