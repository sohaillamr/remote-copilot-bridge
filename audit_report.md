# Synapse Platform - Heavy UX & Functionality Audit

## 1. Missing Functionalities Required for Platform Maturity
- **Team Seat & Member Management:** Users can upgrade to the "Team" tier from Pro, but there is no dedicated UI to invite other email addresses, revoke seat access, or monitor team-wide usage in a unified view.
- **Agent Lifecycle Interactivity:** Agent connectivity status is polled, but real-time updates (Supabase Realtime) on the gents table would prevent connection latency issues when switching tools. 
- **Subscription Portal Actionability:** Users paying for Pro or Team cannot inherently alter payment methods, check receipts, or explicitly "Cancel". Integration with the Stripe Customer Portal (ctive / past_due status syncing) needs building on the backend.
- **Granular Git Versioning Details:** The current /git tool in Chat executes basic commits. Advanced states (branching, stash, conflict states) are hidden unless output by the CLI terminal.

## 2. Recommended UX Enhancements
- ? **Implemented:** Textarea Auto-Resize in Chat. Previously the textarea wouldn't expand when writing multi-line complex Prompts (like providing a whole block of code). 
- **Global Loading States:** Better skeleton models to prevent UI pop-in when Supabase queries resolve in FileBrowser.tsx and Dashboard.tsx.
- **Keyboard Shortcuts:** A lack of robust shortcuts inside the App. Features like Cmd+K for searching past chats, Esc to unfocus input.
- **Visual Feedback on Background Processing:** While LLM tools are streaming responses, a smoother streaming animation or clearer "Thought" blocks (similar to o1-preview) would clarify the Agent Relay's actions.

## 3. General Architecture Observations
- Relaying system over WebSockets via Supabase DB states is highly reliable but susceptible to DB bottleneck when user count scales. A dedicated direct websocket connection server outside the database edge might be needed later.
