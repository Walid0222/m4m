# Chat scroll jitter – diagnosis

## Scope

Searched the chat codebase for anything that modifies scroll position:

- **scrollTop** assignments: none found
- **scrollIntoView**: 1 place (admin dashboard only, not user chat)
- **scrollToIndex** (Virtuoso): 1 place – user chat
- **Virtualization**: user chat uses **react-virtuoso** only (`VirtualizedMessages.jsx`); no `MessageList.jsx` in the project
- **ChatPage.jsx**: no scroll-related code
- **ChatBox.jsx**: no scroll-related code
- No custom hooks that touch scroll

---

## Every place where scroll is modified

### 1. **VirtualizedMessages.jsx** (user chat – main suspect)

| Location | What it does | When it runs |
|----------|--------------|--------------|
| **Lines 113–151** | `useEffect` calls `virtuosoRef.current?.scrollToIndex({ index: lastMessageIndex, align: 'end', behavior: 'smooth' })` | When `rows` or `currentUserId` changes **and** the last message id changed (`isNewMessage`) **and** (user sent the message **or** `isAtBottomRef.current` is true) |
| **Line 205** | `followOutput={false}` on `<Virtuoso>` | Disables Virtuoso’s built‑in “follow output” auto-scroll (already set to `false` to avoid double-scroll) |
| **Lines 385–387** | `atBottomStateChange={(atBottom) => { isAtBottomRef.current = atBottom }}` | Virtuoso calls this when it decides the user is at bottom or not; only updates a ref, does not scroll |

**Conclusion for user chat:**  
Only one mechanism scrolls the list: the `useEffect` that calls `scrollToIndex` when a **new** message appears and the user is at bottom (or sent it). So there are not “multiple auto-scroll mechanisms” in user chat anymore. If jitter remains, it is likely either:

- **Virtuoso internals**: with variable-height rows, `scrollToIndex(…, behavior: 'smooth')` can cause the list to re-measure and adjust scroll during the animation, producing a short vibration at the end, or  
- **Effect running more than intended**: e.g. if `rows` gets a new reference every render (parent re-renders, unstable `useMemo` deps), the effect runs every time; it only calls `scrollToIndex` when `lastId !== prevLastId`, but the repeated effect + Virtuoso updates could still contribute to jitter.

---

### 2. **AdminDashboardPage.jsx** (admin support – not user chat)

| Location | What it does | When it runs |
|----------|--------------|--------------|
| **Lines 1499–1502** | `useEffect` calls `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })` | On every `threadMessages` change (admin support thread messages) |

**Conclusion:**  
This runs only in the **admin** support dashboard, not in the user-facing chat. It does not affect the chat scroll jitter on the chat page.

---

## Summary

- **User chat** (ChatPage → ChatBox → VirtualizedMessages):  
  - **Single** scroll mechanism: one `useEffect` in `VirtualizedMessages.jsx` that calls `scrollToIndex` only when the last message id changes and the user is at bottom (or sent the message).  
  - `followOutput` is `false`, so Virtuoso is not doing a second auto-scroll.  
- **ChatPage.jsx** and **ChatBox.jsx** do not modify scroll.  
- **MessageList.jsx** does not exist; the list is implemented in **VirtualizedMessages.jsx** with **react-virtuoso**.  
- **AdminDashboardPage.jsx** uses `scrollIntoView` for admin support threads only; unrelated to user chat jitter.

**Most likely cause of bottom vibration in user chat:**  
Either Virtuoso’s internal handling of `scrollToIndex` with variable-height rows (re-measure → small scroll corrections at the end of the smooth scroll), or the effect firing on every `rows` change (even when we don’t call `scrollToIndex`) and interacting with Virtuoso’s layout updates. Not multiple competing auto-scroll mechanisms in the app code.
