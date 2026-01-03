# Micro-UX Gamification Design

> Philosophy: Every action should _feel_ good. The best apps have this invisible quality - tapping feels satisfying, you always know where you stand, and there's subtle delight everywhere.

## 1. Action Scarcity & Visibility

The "X actions left today" concept creates:

- **Value** for each action (not infinite, choose wisely)
- **Urgency** (use them or lose them)
- **Feedback** (know exactly where you stand)

### UX Patterns

**Inline in upvote button:**

```
Before tap:  [▲ 7]     ← shows remaining
After tap:   [▲ 6] ⚡   ← lightning flash, count drops
Last one:    [▲ 1] 🔥   ← urgent styling
Depleted:    [▲ 0]     ← greyed out, "Resets in 4h"
```

**Status bar (notifications or header):**

```
┌─────────────────────────────────────┐
│  ⚡ 7 upvotes remaining today       │
│  ████████░░░░  (7/10)               │
└─────────────────────────────────────┘
```

### Notification Messages

- "⚡ You have 3 upvotes left - make them count!"
- "🔋 Actions recharged! You have 10 fresh upvotes"
- "⏰ 2 hours until your actions reset"

---

## 2. Upvote Micro-interaction

Most frequent action - MUST feel satisfying.

### Visual Feedback Options

| Effect          | Description                          | Vibe                |
| --------------- | ------------------------------------ | ------------------- |
| Lightning bolt  | ⚡ shoots up from button             | Powerful, energetic |
| Particle burst  | Small dots explode outward           | Celebratory         |
| Ripple effect   | Circle expands from tap point        | Subtle, satisfying  |
| Number fly-up   | "+1" floats up and fades             | Clear feedback      |
| Power indicator | Larger animation = higher vote power | Shows impact        |

### Vote Power Visualization

Different animations based on voter's power:

```
Low power (1.0x):   Small spark
Medium (2.0x):      Lightning bolt
High (3.5x):        Double lightning + particles
Whale (4.5x+):      Thunder effect ⚡⚡ + screen shake
```

This makes holding YAP feel impactful - your upvotes literally look more powerful.

### Haptic Patterns

| Action          | Haptic          | Feel              |
| --------------- | --------------- | ----------------- |
| Upvote          | Light impact    | Quick, snappy     |
| Undo upvote     | Soft tap        | Gentle reversal   |
| Whale upvote    | Heavy + success | Powerful impact   |
| Action depleted | Warning pattern | "Oops, none left" |

### Sound Design

| Action            | Sound                | Notes                    |
| ----------------- | -------------------- | ------------------------ |
| Upvote            | Soft "pop" or "ping" | Satisfying, not annoying |
| High-power upvote | Deeper "thunk"       | More substantial         |
| Whale upvote      | Electric zap         | Memorable                |
| Last action       | Different tone       | Signals scarcity         |

---

## 3. Notification Center as Command Center

Transform from activity feed → status dashboard:

```
┌─────────────────────────────────────────────┐
│  📊 Your Status                             │
│  ─────────────────────────────────────────  │
│  ⚡ Actions: 7/10 remaining                 │
│  🔥 Streak: 12 days (safe until midnight)   │
│  💰 Claimable: 234 YAP                      │
└─────────────────────────────────────────────┘
│  🔔 Recent Activity                         │
│  ─────────────────────────────────────────  │
│  A Yapper upvoted with 2.3x power     2m   │
│  You gained a new follower            15m  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Time-Sensitive Notifications

- Live countdown: "Streak expires in **2h 34m**"
- Color coding: Green (safe) → Yellow (warning) → Red (urgent)
- Pulsing animation on urgent items

---

## 4. Other Micro-UX Opportunities

### Post Creation

- Satisfying "whoosh" when post sends
- Brief success state: "Posted! ✓" with confetti
- Haptic confirmation

### Claiming Rewards

- Tokens "rain down" into wallet animation
- Counter ticks up: 0 → 234 YAP
- Celebratory haptic pattern
- Sound: coins/chime

### Pull-to-Refresh

- Custom Yap-branded loading animation
- Haptic "snap" when released
- Logo animates during refresh

### Streak Maintenance

First action of the day triggers:

- "🔥 Streak extended! Day 13"
- Brief celebration animation
- Satisfying haptic

### Error States

- Friendly, not scary
- Haptic warning (different from success)
- Clear recovery path

---

## 5. Settings & Accessibility

```
Settings:
├── 🔊 Sounds: [On/Off]
├── 📳 Haptics: [On/Off]
└── ✨ Animations: [On/Off/Reduced]
```

Respect `prefers-reduced-motion` media query.

---

## Codebase Analysis (Current State)

> Explored December 2024

### 1. Action Limits ✅ EXISTS

**Config**: `constants.ts`

```typescript
DAILY_ACTION_LIMIT = 8; // Total actions per day (posts + comments + upvotes combined)
```

- Unified limit for ALL actions (not separate)
- Tracked in `daily_actions` table
- Resets at UTC midnight
- API: `/api/user/limits` returns remaining count
- Returns 429 when exceeded

**Opportunity**: Already have limits! Just need to surface them better in UI.

---

### 2. Current Upvote UX

**File**: `components/posts/UpvoteButton.tsx`

**Current Design**:

- Lucide `ArrowUp` icon (14px)
- Pill-shaped button with count
- States:
  - Default: `bg-gray-50 text-gray-600`
  - Upvoted: `bg-blue-50 text-blue-600 fill-current`
  - Loading: `opacity-50 cursor-wait`
- Count shows decimal: `count.toFixed(2)` (e.g., "12.50")
- `transition-all` for smooth color changes

**Missing**:

- No lightning/particle animation
- No haptic feedback
- No sound
- No visual distinction for high-power votes

---

### 3. Vote Power Display

**Current Implementation**:

- Vote weight stored with each upvote in DB
- Formula: `1 + 4 * (staked / (staked + 1M))` → [1.0, 5.0)
- Shown ONLY as decimal in total count (e.g., "2.50" instead of "2")
- User's own vote power NOT displayed anywhere

**Gap**: Users don't know their vote power or see impact visually.

---

### 4. Sound/Haptic Infrastructure ❌ NOT EXISTS

- No sound files in project
- No `navigator.vibrate()` calls
- No audio library
- No haptic utilities
- Push notifications exist but no audio feedback

**Need to Build**:

- `hooks/useHaptics.ts`
- `hooks/useSound.ts`
- Sound asset files
- Settings toggles

---

### 5. Notification UI Architecture

**File**: `components/notifications/NotificationsList.tsx`

**Current Structure**:

```
┌─────────────────────────────────────┐
│ [Avatar] Name action text     2h   │
│          Post preview...           │
├─────────────────────────────────────┤
│ [Avatar] Name action text     5h   │
│          Post preview...           │
└─────────────────────────────────────┘
```

- Simple vertical list
- No header/status section
- No unread indicator (tracked in DB but not shown)
- Types: mention, upvote, comment, follow

**Opportunity**: Add status dashboard at top!

---

### 6. Animation Library

**Status**: Tailwind CSS only (no Framer Motion)

**Available in `globals.css`**:

```css
@keyframes slide-in-right { ... }  /* Used for toasts */
@keyframes slide-up { ... }        /* Used for modals */
```

**Accessibility**: Respects `prefers-reduced-motion`

**Options**:

1. Add Framer Motion for complex animations
2. Build with CSS keyframes (lighter weight)
3. Use Lottie for pre-made animations

---

### 7. Points System

**How It Works**:

- Upvote someone → They get points = YOUR vote_weight
- Vote weight: 1.0 (no stake) to 5.0 (max stake)
- Points stored in `users.points`
- Convert to YAP daily via merkle distribution

**No Multipliers**:

- No streak bonus
- No time-of-day bonus
- No combo bonus
- Vote power is the ONLY multiplier

**Opportunity**: Add streak multiplier? Daily first-action bonus?

---

### 8. Settings Page

**File**: `app/settings/page.tsx`

**Current Sections**:

- Account (Edit Profile) ✅
- App Settings (Coming Soon) ← **Sound/haptics go here**
- Privacy & Security (Coming Soon)
- Help & Support (Coming Soon)
- Wallet ✅
- Sign Out ✅

**Infrastructure Ready**: Menu pattern exists, easy to extend.

---

## Summary: What We Have vs Need

| Feature       | Have          | Need                |
| ------------- | ------------- | ------------------- |
| Action limits | ✅ 8/day      | Surface in UI       |
| Upvote button | ✅ Basic      | Animation, feedback |
| Vote power    | ✅ Calculated | Show to user        |
| Sounds        | ❌ None       | Build from scratch  |
| Haptics       | ❌ None       | Build from scratch  |
| Notifications | ✅ Basic list | Status dashboard    |
| Animations    | ✅ Tailwind   | Add Framer Motion?  |
| Settings      | ✅ Structure  | Add toggles         |

---

## Animation Library Decision

**Chosen: Motion (motion/react)**

| Criteria          | Motion         | Anime.js | GSAP       |
| ----------------- | -------------- | -------- | ---------- |
| Bundle size       | **2.3kb** mini | 17kb     | 60kb+      |
| React integration | Native         | Manual   | Hook-based |
| WAAPI support     | ✅ Auto        | ✅ v4    | ❌         |
| License           | MIT            | MIT      | Custom     |

See **#102** for full comparison.

```bash
bun add motion
```

---

## Implementation Priority

### Phase 1: Foundation

- [ ] #96 Sound & Haptic Infrastructure
- [ ] #94 Surface Action Limits in UI
- [ ] Install Motion library

### Phase 2: Upvote Polish

- [ ] #95 Upvote Micro-interaction (lightning animation)
- [ ] #98 Vote Power Visibility
- [ ] Haptic feedback integration

### Phase 3: Notifications Enhancement

- [ ] #97 Status Dashboard section
- [ ] Live countdowns
- [ ] Action remaining indicators

### Phase 4: Broader Polish

- [ ] #99 Post Creation Feedback (confetti)
- [ ] Claim animation
- [ ] Pull-to-refresh branding

---

## Related GitHub Issues

| #    | Title                         | Category     |
| ---- | ----------------------------- | ------------ |
| #94  | Surface Action Limits in UI   | Micro-UX     |
| #95  | Upvote Micro-interaction      | Micro-UX     |
| #96  | Sound & Haptic Infrastructure | Micro-UX     |
| #97  | Notification Status Dashboard | Micro-UX     |
| #98  | Vote Power Visibility         | Micro-UX     |
| #99  | Post Creation Feedback        | Micro-UX     |
| #100 | Show Dollar Value on Posts    | Gamification |
| #101 | Bug Report & Feedback Page    | Support      |
| #102 | Animation Library Comparison  | Research     |
