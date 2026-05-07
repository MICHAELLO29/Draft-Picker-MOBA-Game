# MLBB Draft Strategizer — System Prompt & Logic Correction

**Version:** 2.0  
**Patch Reference:** Season 40 • Patch 2.1.67  
**Scope:** Hero-based competitive and ranked draft logic

---

## 1. PURPOSE

This document defines the **correct flow, logic, and rules** for the MLBB Draft Strategizer system. It corrects the current flawed behavior where the Ban Impact panel continues to display analysis anchored on **already-banned heroes**, rendering the suggestions irrelevant and misleading.

---

## 2. CORE PROBLEM WITH CURRENT SYSTEM

### ❌ Current (Broken) Behavior

```
Alucard is banned by Blue Team
    ↓
Ban Impact panel STILL shows:
- "Counter Bans: Strong vs Alucard" → Barats, Thamuz, Phoveus
- "Now Safe to Pick: Weak vs Alucard" → Sun, Irithel
    ↓
RESULT: Dead information. Alucard is no longer in the pool.
All analysis around him is irrelevant and wastes decision-making.
```

### ✅ Required (Correct) Behavior

```
Alucard is banned by Blue Team
    ↓
System REMOVES Alucard from the active threat pool
    ↓
Ban Impact panel RECALCULATES based on:
- Heroes currently PICKED on the board
- Heroes still AVAILABLE in the pool
    ↓
RESULT: Live, relevant analysis only
```

---

## 3. CORRECT DRAFT LOGIC FLOW

### Phase 0 — Pre-Draft State

Before any pick or ban is made, the system should:

- Load the **full hero pool** as active threats
- Set Ban Impact to **neutral / meta-based** (top winrate heroes, patch tier list)
- Show **suggested first bans** based on current patch meta strength

---

### Phase 1 — Ban Phase Logic

#### Rule 1: Real-Time Pool Pruning

```
ON any hero banned {
    Remove hero from: ActiveThreatPool
    Remove hero from: SafePickList
    Remove hero from: CounterBanSuggestions
    Recalculate: BanImpact relative to remaining ActiveThreatPool
    Recalculate: SafePickList relative to remaining ActiveThreatPool
}
```

#### Rule 2: Ban Priority Order

The system should suggest bans in this priority:

| Priority | Target | Reason |
|---|---|---|
| 1st | Top meta heroes (S-tier this patch) | Remove broken heroes with no clear counters |
| 2nd | Heroes that hard-counter YOUR planned comp | Protect your win condition |
| 3rd | Heroes that enable enemy's planned comp | Deny their synergy |
| 4th | Flex picks that have no weaknesses | Remove unpredictable threats |

#### Rule 3: Counter Ban Calculation

Counter ban suggestions must be based on:

- Heroes **already picked** by the enemy team (not banned heroes)
- Heroes **still available** in the pool
- The **specific threat** those counter bans address must be visible on the board

```
Counter Ban Panel Label:
"Counter Ban: Strong vs [ENEMY PICKED HERO]"
                          ↑
              Must be a PICKED hero, not a BANNED hero
```

---

### Phase 2 — Pick Phase Logic

#### Rule 4: Safe Pick List Update

```
ON any hero picked OR banned {
    Remove hero from: SafePickList
    For each hero in SafePickList {
        Recalculate winrate context vs CURRENT board state only
        Remove heroes whose threat reason no longer exists in pool
    }
}
```

#### Rule 5: Pick Order Awareness

The system should flag which pick slot is being filled:

| Pick Slot | System Guidance |
|---|---|
| First Pick | Recommend safe/flex heroes — hard to counter |
| Mid Picks | Recommend synergy picks relative to first pick |
| Last Pick | Recommend counter picks relative to enemy's visible comp |

#### Rule 6: Synergy Tracking

As picks are made, the system should:

- Track **comp identity forming** (dive, poke, turtle, teamfight, pick-off)
- Suggest picks that **reinforce** the forming comp
- Warn if a pick **contradicts** the team's forming win condition

---

### Phase 3 — Ban Impact Panel Rules

This is the **most critical correction** needed.

#### Current Labels (Wrong):
- "Counter Bans (Strong vs [BANNED HERO])" ❌
- "Now Safe to Pick (Weak vs [BANNED HERO])" ❌

#### Corrected Labels (Right):
- "Counter Bans (Strong vs [PICKED ENEMY HERO])" ✅
- "Now Safe to Pick (Weak vs [PICKED ENEMY HERO])" ✅
- "Threat Alert: [HERO] still in pool — ban or have answer ready" ✅

#### Panel Behavior Rules:

```
IF no heroes are picked yet:
    → Show meta-based ban suggestions (patch tier)

IF enemy has picks on board:
    → Anchor analysis to MOST DANGEROUS enemy pick
    → Show counter bans vs that pick

IF a hero is banned:
    → Immediately remove from all panel calculations
    → Refresh panel within same interaction frame
    → Never reference a banned hero in any suggestion

IF all bans are used:
    → Shift panel entirely to Pick Recommendations
    → Show counter picks vs remaining enemy heroes
    → Show synergy picks for your own team
```

---

## 4. LOGIC DECISION TREE (Full Draft)

```
START DRAFT
│
├── [PRE-DRAFT]
│   ├── Load full hero pool
│   ├── Show patch meta tier
│   └── Suggest priority ban targets
│
├── [BAN PHASE — Each Ban Turn]
│   ├── Team makes ban
│   ├── IMMEDIATELY remove from pool
│   ├── IMMEDIATELY recalculate BanImpact
│   ├── Update Counter Ban suggestions (vs active picks only)
│   └── Update Safe Pick list (vs remaining pool only)
│
├── [PICK PHASE — Each Pick Turn]
│   ├── Team makes pick
│   ├── Remove from pool
│   ├── Update Comp Identity tracker
│   ├── Update Synergy suggestions
│   ├── Update Counter Pick suggestions (vs enemy picks)
│   └── Warn if pick contradicts team comp forming
│
└── [DRAFT COMPLETE]
    ├── Show final Comp Summary (Blue vs Red)
    ├── Show Win Condition for each team
    ├── Show Threat Assessment (who has draft advantage)
    └── Show Early/Mid/Late game power curve comparison
```

---

## 5. BAN IMPACT PANEL — CORRECT STATE MACHINE

```
State: IDLE
→ Trigger: Draft starts
→ Action: Show patch meta bans

State: HERO_BANNED
→ Trigger: Any hero banned
→ Action: Remove from pool → Recalculate → Never reference again

State: ENEMY_PICKED
→ Trigger: Enemy locks a hero
→ Action: Set as primary threat anchor → Show counter bans vs this hero

State: ALLY_PICKED
→ Trigger: Your team locks a hero
→ Action: Update synergy tracker → Show what protects this pick

State: POOL_DEPLETED (all bans used)
→ Trigger: Ban phase ends
→ Action: Shift to pure pick recommendations mode
```

---

## 6. EXAMPLE — CORRECT BEHAVIOR (Based on Screenshot)

**Situation:**
- Blue bans: Akai, Alice, Alucard
- Red bans: Aldous, Alpha, Angela
- Blue picks: Argus
- Red picks: Arlott, Aamon

**What the Ban Impact Panel SHOULD show:**

```
BAN IMPACT PANEL — CURRENT STATE

Active Threat Analysis: [Based on Arlott + Aamon — Enemy Picks]

⚠ COUNTER BAN SUGGESTIONS (Strong vs Arlott + Aamon):
- Mathilda → Enables Aamon dive significantly (ban if available)
- Floryn → Sustain support that lets Arlott stay aggressive longer
- Phoveus → Can leap on both dive heroes — consider PICKING not banning

✅ NOW SAFE TO PICK (Argus is locked — protect him):
- Esmeralda is still in pool — she counters Argus (ban recommended)
- Uranus is still in pool — strong Argus counter (ban recommended)

🔵 BLUE TEAM COMP FORMING:
- Argus = late game fighter → Need frontline + engage support
- Suggested next picks: Franco, Tigreal, Mathilda (if not banned)

🔴 RED TEAM WIN CONDITION FORMING:
- Arlott + Aamon = aggressive dive comp
- They need: Healer/sustain support + tank engage
- Watch for: Angela (banned ✅), Floryn, Rafaela picks
```

---

## 7. RULES SUMMARY

| Rule | Description |
|---|---|
| R1 | Banned heroes are **immediately removed** from all calculations |
| R2 | Ban Impact anchors only to **picked heroes on the board** |
| R3 | Safe Pick list updates after **every ban AND pick** |
| R4 | Counter Ban suggestions reference only **available heroes** |
| R5 | System tracks **comp identity** as picks accumulate |
| R6 | Last pick slot triggers **full counter pick mode** |
| R7 | Panel labels must always name the **specific hero threat** they address |
| R8 | No dead information — if a threat is gone, remove it from the panel |

---

## 8. ANTI-PATTERNS TO AVOID

```
❌ Showing "Counter Ban vs Alucard" after Alucard is banned
❌ Keeping Safe Pick list unchanged after new bans/picks
❌ Anchoring threat analysis to a hero no longer in the pool
❌ Suggesting picks without checking if they're still available
❌ Showing synergy suggestions that don't match current comp forming
❌ Ignoring enemy picks when calculating counter bans
```

---

## 9. IMPLEMENTATION NOTES

- Ban Impact panel must **reactively update** on every draft event (ban or pick)
- All hero references in the panel must pass a **pool availability check** before displaying
- The panel should have a **clear state label** showing what its current analysis is anchored to
- If no anchor exists yet (no picks made), default to **patch meta tier suggestions**
- Threat calculations should consider **both teams' board states** simultaneously, not independently

---

*End of System Prompt — MLBB Draft Strategizer Logic Correction v2.0*
