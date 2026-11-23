# How great action-game bosses work, and what Solfall takes from them

A study written for v2.1a. Sources: Hollow Knight, Dark Souls I-III, Sekiro, Elden Ring, Dead Cells, Cuphead,
Hades; design writing listed at the end. Nothing here copies a boss: each idea below is a principle, and
every Solfall move built from it is original and told through that boss's own body.

## 1. The attack is a cycle: tell, commit, recover

Every one of these games builds an attack in three parts: a **wind-up** that says what is coming, the
**active** part, and a **recovery** in which the boss is open. Hollow Knight is the clearest example: its
bosses are fought almost entirely in recovery windows (False Knight's mace stuck in the floor, Hornet
standing after her needle throw, a Mantis Lord after landing). Psychonauts 2's boss team describes the same
telegraph-attack-recovery shape as the unit of design.

The rule that falls out: **the bigger the commitment, the bigger the window.** A boss that throws its whole
body into a move should be stuck, stunned or turning slowly afterwards, and the player should learn that a
good dodge of a big move is the moment to hit hard. A quick jab leaves a sliver of time; a leaping slam that
buries the weapon leaves a long one.

Solfall: `B.body.exposed` and the recovery (`B.recover`) already exist. New big moves end with a real,
visible stuck or spent pose and a longer `exposed`; small moves stay quick.

## 2. Breaking the rhythm: delays, feints and branches

Dark Souls bosses carry at least five attacks they can use at any time, so the player reads each one instead
of memorising an order. On top of that, FromSoftware's later bosses break rhythm on purpose:

- **Delayed attacks** hold a wind-up past where a reflex dodge expects the blow (Elden Ring is known for
  them; Margit is the classic case). They punish panic dodging, not reading.
- **Feints and animation cancels**: a wind-up that turns into a different attack.
- **Branching combos**: a string that ends after two hits, or carries on to a third or fourth depending on
  where the player is (Gael, Friede, Sister of Battle chains in Hollow Knight).

The criticism of these is fair too: a delay with no way to read it is a coin toss. Sekiro's answer was a
clear signal for the dangerous variants. Solfall's answer is its tells (memory: body tells per boss): a
delayed blow and a quick one must look different, if only slightly (a held breath, a trembling blade, a
dimmed mane). Delays then reward the player who watches the body instead of the clock.

## 3. Pressure: the boss comes to you

Dead Cells and Hollow Knight's late bosses (Nightmare King Grimm, Pure Vessel, Sisters of Battle) rarely let
the player rest. They use **gap-closers** (teleports to the player, dashes, leaps), **chains** of short attacks
that follow the player, and **position-aware choice**: Hollow Knight's bosses pick their next attack from where
the player is (far: something ranged; close: a swing; above: an attack that goes up). Grimm can chain
dash-uppercut-fire several times in a row, regardless of what the player does.

Solfall: chained "harrying" moves of 3-5 short beats that chase the hero, ending in a committal finisher with
a punish window; and choice by position for every boss.

## 4. Answers to where the player hides

Every good boss has an answer to each place the player can stand: far away, close, behind, **above**. In a
platformer, sitting on or bouncing on a boss's head is the classic exploit; Hollow Knight answers it with
moves that go up (uppercuts, fire pillars, shrieks), and many bosses cast at the player's position on a
timer (pillars under the player, beams through where they stand, spikes that come up where they wait).

Solfall already answers keeping away (`B.answer`) and the Knight's back (Heel). v2.1a adds a shared timer in
`js/bosskit.js`: `B.above` fills while the hero rides over a boss's head (on it, hopping on it, or on a
ledge just above) and after 1.4 s the boss casts its **anti-air answer** (`B.antiAir`), aimed at where the
hero is. Each boss's is its own.

## 5. Projectiles that behave differently

Cuphead's bosses make most of their variety from what projectiles **do**: speed, size, path, and whether
they can be parried. Hollow Knight's Radiance, Soul Master and Hornet add homing orbs, sweeping sword walls,
delayed bursts and thread traps. A fight with only straight shots reads as one attack.

Kinds worth having, each a different answer:

| Behaviour | The answer it asks for |
|---|---|
| Straight, fast | jump or duck at the right moment |
| Fan / spread | find the gap |
| Homing, slow | keep moving, cut it, outlast it |
| Bouncing / rolling | read the bounce, jump it on the ground |
| Boomerang / returning | dodge twice, the second from behind |
| Delayed burst (mines, traps) | leave the area, or use the time |
| Splitting | cut it far away, or dodge the pieces |
| Wall with a gap (sweeping) | find and move with the gap |
| Positional cast (at the player) | keep moving; stillness is punished |
| Lingering ground | fight on what is left |

## 6. Spectacle and the arena

Hollow Knight's Radiance rebuilds its arena mid-fight; Elden Ring bosses have arena-wide moves that change
what the player does for a few seconds (Malenia's flurry, Rennala's summons). The best set-pieces still ask
for something specific: a set-piece that is only to be watched is a non-mechanic (the user's own rule).

Solfall: each boss's phase changes already rebuild the arena. New spectacle moves are short (3-6 s), ask for
one clear thing (find the gap, climb, keep moving), and leave the boss open at the end.

## 7. Dynamic moves

Moves that adapt while they happen: a lunge that steers, a slam that tracks before it drops, a combo whose
next step depends on the player's position, an attack that turns if the player crosses behind. These make a
boss feel alive and stop the player from standing in one learned safe spot.

## What v2.1a builds from this

For every boss: an anti-air answer (section 4), new moves that use delays or branches (2), pressure (3),
new projectile behaviours (5), a spectacle move (6), and reworks of older moves to add a delayed or branching
form and a clearer punish window (1, 2). See the README section for v2.1a for the list.

## Sources

- Game Developer: [Anatomy of an Enemy Attack in Dark Souls 3](https://www.gamedeveloper.com/game-platforms/anatomy-of-an-enemy-attack-in-dark-souls-3);
  [The Impact of Dark Souls on Boss Design](https://gamedeveloper.com/design/the-impact-of-dark-souls-on-boss-design);
  [Designing for Difficulty: Readability in ARPGs](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs);
  [A modular system of maneuvers for Psychonauts 2's boss fights](https://www.gamedeveloper.com/marketing/using-a-modular-system-of-maneuvers-to-design-i-psychonauts-2-i-s-boss-fights-in-a-hurry);
  [Dissecting Design: Cuphead](https://www.gamedeveloper.com/design/dissecting-design-cuphead)
- GamesRadar: [how Silksong reworked how bosses pick their attacks](https://www.gamesradar.com/games/platformer/compared-to-hollow-knight-silksong-reworked-how-the-bosses-pick-their-attacks-and-suddenly-i-realize-why-i-got-crushed-so-often)
  (Hollow Knight chose attacks by the player's position)
- Automaton: [Elden Ring's delayed attacks](https://automaton-media.com/en/news/20220316-10577/)
- Wayline: [The art of the fakeout in combat design](https://www.wayline.io/blog/the-art-of-the-fakeout-combat-design)
- Hollow Knight wiki: [Nightmare King Grimm](https://hollowknight.wiki/w/Nightmare_King_Grimm)
- Game Maker's Toolkit, "How Cuphead's Bosses Try to Kill You"
