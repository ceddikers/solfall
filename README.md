# Solfall

A side-on boss rush for the browser: four heroes, seven three-phase bosses, played as a run of
ever-harder trials. You pick a hero and a relic before the run and win a boon after each victory.
Version 2.4d.

This is an early slice of a planned boss-rush roguelite (short runs, a boon after each boss,
bosses drawn from a pool). A run meets the four bosses in a shuffled order, then meets them again, harder.

## Play

**Play in your browser: https://ceddikers.github.io/solfall/**

To run it from this folder instead, double-click `index.html`, or run a local server:

```
node tools/serve.js
```

then open http://localhost:8321. There is no build step and no dependency.

## Controls

| Action | Keys | Gamepad |
|---|---|---|
| Move | A / D or arrow keys | stick or d-pad |
| Jump, double jump | Space or Z | A |
| Attack | J or X, or left click (towards the cursor) | X |
| Aim an attack up or down | hold W / S or up / down | stick |
| Dash (passes through attacks) | K or C or Shift | B or RB |
| Special (costs one Starlight segment) | L or V, or right click (at the cursor) | Y |
| Mend one health (costs one segment) | hold E or F while standing | LB |
| Dawnbreak (when its bar is full) | Q or I, or middle click | RT |
| Crown (once three boons of one set are held, when its bar is full) | U | LT |
| Flourish (a salute that leaves you open) | T or G | Back, or press the right stick |
| Drop through a platform | S + Space | down + A |
| Your hero's moves (the fight waits while it is up) | hold Tab, or Moves in the pause menu | |
| Help: how a fight works and what every word means | Help on the title screen or in the pause menu | |
| Pause | Esc or P | Start |
| Use something in the camp | E or F, or Enter | LB |

Keyboard keys can be changed in Settings, Controls: choose an action, press the key it should use. A key
does one thing, so it is taken from whatever had it. Prompts in the game follow your bindings. The mouse
and gamepad are fixed.

| | | |
|---|---|---|
| Retry (works the moment you fall) | R | |

## The Vigil (new in v0.9a)

The title screen now leads to a camp, the Vigil, where you move your hero about freely. Since v0.9b it
is a little over three screens wide (4,040 pixels) and the view follows the hero across it. What used to be
menu options are places in it, left to right:

| Place | Walk up and press E to |
|---|---|
| The Hall of Echoes | become the hero standing in an alcove. Each hero has their own alcove; yours holds only your sigil while you are out of it. |
| The Shrine | open the Shrine and spend Sunshards. One small shard circles the great one for each trophy won. |
| The campfire | nothing: it is where you arrive from the title screen |
| The training yard | nothing to press: hit the sparring post. It shows the damage of your last flurry, cannot be destroyed, and charges Dawnbreak three times as fast, so every move can be tried here. Starlight starts full. |
| The brazier | step the difficulty: Gentle, Standard, Merciless. The flame grows and changes colour with it. |
| The proving ring | practise against any boss, starting from phase I, II or III. The first row of its menu chooses the foe (left / right; *Random* picks one). No relic, no omen, no reward, nothing lost; R tries again. (The banners that once stood before it went in v1.8c.) |
| The reliquary | take the relic for your run. Each relic on offer (three, or four with the Shrine's Fourth Relic) turns over its own plinth; walk up to one to read it and press E to take it. You can change your mind until you go through the gate. The relic works at once, so it can be tried on the sparring post. |
| The gate | begin the run with the relic you took. If you have not taken one, it asks you to choose from the same relics as a menu. You come back out of it when a run ends. |

The backdrop is painted once into four layers that slide at different speeds as you walk: the sky (with
a thin moon and the dimmed sun low over the gate), far hills, a ruined aqueduct, and near columns,
tents and trees. The places, the fires, the grass (which bends away from you) and the fireflies are
drawn each frame. A marker at the top right points to the gate until it is in view.

Nothing can hurt you in the camp. Esc opens the menu (settings, how to play, quit to title). After a run,
**New run** (or R) goes straight to the relic choice as a menu, so a retry is as quick as before, and
**Back to camp** returns you to the Vigil beside the gate. The relics on offer are drawn afresh each time
you arrive, and again if you change hero or difficulty, since both decide what may be offered.
The camp is `js/hub.js`; the sparring post is a stand-in boss (`G.bosses.dummy`), which is why every
weapon, special and Dawnbreak works on it unchanged.

## Polish and quality of life (v1.0a)

This build came from three things: reading what players and designers say made games of this kind a
treat, looking at every screen as a player sees it, and measuring the playtest questions with a scripted
hero (`tools/feel-check.js`).

**What the reading said, and what was done about it**

| What makes these games a treat | In Solfall |
|---|---|
| Failure should still feel like progress, and getting back in should be quick (Hades) | Every fight already pays Sunshards win or lose. The defeat screen now says what landed the last blow. R is still an instant retry. |
| Players want to practise the boss or phase they failed, not replay everything before it (Furi, Cuphead) | The proving ring in the camp: any boss, from any phase, at no cost. |
| Forgiving input: a jump just after leaving a ledge, a press just before landing (Celeste) | Already here: 0.09 s of coyote time, 0.13 s buffers on jump, attack, dash and special, and presses made during a dash are kept. |
| Attacks must be readable and fair even when fast | Unchanged rule: every warning is the same red-orange. Smoke is drawn behind warnings. |
| Flashes, shake and bindings should be the player's choice (Xbox accessibility guidelines) | New Screen flashes setting (Full, Reduced, Off); flashes less than a third of a second apart are damped whatever the setting; keyboard keys can be rebound. Screen shake already had a setting. |

**What looking at every screen found**

- The How to play panel had grown taller than the screen, hiding its own Back button. Rewritten shorter; it fits.
- The title overlapped the Warden's eye. Moved down.
- The camp had no display for Starlight or Dawnbreak, so charging Dawnbreak on the post could not be seen. It now shows the hero's name and both bars.

**What the measurements found** (scripted hero that cannot be hurt, attacks without stopping, never dodges)

- Dawnbreak fills 2 or 3 times a fight for every hero against every boss, the first at 15 to 36 seconds. That was the aim; left alone.
- A Reckoning's ward breaks in 1 to 4 seconds of steady attacking, against 6.5 allowed. Left alone.
- Flow reached SS within ten seconds of steady attacking and stayed there, so the rank meant nothing. It now always drains, faster the higher it stands; heroes who swing slower earn more per hit; a perfect dodge is worth more. The same scripted hero now peaks at A or S and holds A or better for between a tenth and two thirds of a fight, so reaching the top takes dodges.

**Also new**

- Your fastest win against each boss is kept per difficulty and shown at the proving ring (for the foe last chosen there), with how often you have beaten it.
- A welcome line the first time you arrive in the camp each session.
- Dawnbreak in the camp only fires within reach of the sparring post.
- The pause menu lists the trial's omen.
- Settings, Reset progress erases Sunshards, upgrades, trophies and records (it has to be chosen twice).

Not done: touch controls, a colour-blind alternative to red-orange warnings, gamepad rebinding.

## The easy three, a little quicker (v2.4d)

Asked for: rather than easing Kairo further, make the other bosses "a tad harder", since a 100% clear rate is odd.

- The Mage, the Leviathan and the Assassin wait about 12% less between attacks (Mage 0.84 / 0.66 / 0.53 s by
  phase, was 0.95 / 0.75 / 0.6; Leviathan 0.84 / 0.7 / 0.57, was 0.95 / 0.8 / 0.65; Assassin 0.7 / 0.55 / 0.44,
  was 0.8 / 0.62 / 0.5), and their warnings are 10% shorter. A boss can now set its own `teleK` against the
  difficulty's warning length (`K.T` in `bosskit.js`); a shorter one never takes the warning scale below 0.6 (Standard is 1.0).
- The Knight is unchanged: it already sits near 90%.

**What the scripted hero says, and why it is not the whole story.** Neither change moved it. With gaps 20%
shorter it still cleared these three 98-99%; with warnings 15% shorter as well, 98-100% (the Knight fell to 90%,
the reason it was left alone). Its dodging rules were written against exactly these bosses (`tools/boss-tests.js`
checks every one of their attacks with them), so it has an answer to nearly everything they do, and a little
less time does not trouble a script. Its 100% means "every attack has a clean answer", not "a person cannot
lose". What would move its number is harder hits (two health for a signature blow) or new patterns, and that is
worth deciding from play, not from the script. These changes are the gentle version, for a person to feel.

## Clear rates, Kairo eased, the heroes retuned (v2.4c)

Asked for: a full test run of every boss with every hero at every trial, then "nerf kairo a bit" (then: "have
him just jump to 50% hp in phase 3"), "aster feels v strong", "lune could use a dps buff but 1 less hp", "test eos
draws", and the defeat screen's buttons, which ran out of the panel.

`tools/clear-rates.js` plays whole fights with a scripted hero: it closes on the nearest part of the boss it
can hit, attacks, mends when low and safe, spends spare Starlight, fires Dawnbreak and crowns, and dodges by
the same rules as `tools/boss-tests.js`, plus three answers those miss (a platform for the Warden's tide, a
double jump on Kairo's crouch for the throw, behind him for the sweeping wave). Each fight gets a random relic,
a random boon per trial before it, and that trial's omens. Run it from the page console:

```
fetch('/tools/clear-rates.js').then(r => r.text()).then(t => (0, eval)(t)); CLEAR.start({ runs: 10 })
```

then `CLEAR.status()` and `CLEAR.table()`. It puts the save data back when it finishes. It is a steady,
mediocre player, so its numbers compare bosses, heroes and trials; they are not what a person will see.

**v2.4b, Standard, 1,680 fights** (10 per boss, hero and trial), win rate:

| Boss | I | II | III | IV | V | VI | All | Vesper | Aster | Lune | Eos |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Leviathan | 100 | 100 | 100 | 98 | 100 | 100 | 100 | 100 | 100 | 98 | 100 |
| Assassin | 98 | 98 | 98 | 100 | 98 | 100 | 98 | 100 | 100 | 95 | 98 |
| Mage | 93 | 98 | 100 | 100 | 93 | 93 | 96 | 98 | 98 | 93 | 93 |
| Knight | 93 | 95 | 90 | 93 | 85 | 90 | 91 | 93 | 97 | 92 | 82 |
| Wolf | 100 | 78 | 75 | 70 | 80 | 78 | 80 | 92 | 100 | 48 | 80 |
| Warden | 75 | 75 | 53 | 70 | 68 | 70 | 68 | 73 | 87 | 52 | 62 |
| Kairo | 43 | 30 | 40 | 50 | 15 | 20 | 33 | 38 | 50 | 17 | 27 |

Kairo hit the scripted hero 5.1 times a fight (the others 1.7 to 4.3), and 9 in 10 of its losses to him came
in phase III. So, for Kairo:

- Still Sky: he rises with half his health back, not three quarters, and waits a little longer
  between attacks (0.72 s against 0.64).
- The Risen barrage that opens phase II: 13 to 16 shots every 0.15 s (was 18 to 22 every 0.13 s).
- Hailfire: 8 to 12 balls, a little slower (was 10 to 15).
- The Gathered Sun's bar is 170 (was 200), so it is thrown smaller more often, and rocks fall from it less
  often (every 0.8 to 1.2 s, was 0.6 to 0.95).

Against him the same scripted hero now wins about 48% (240 fights; Vesper 53, Aster 55, Lune 33, Eos 48),
takes about 4.3 hits a fight, and ends its wins on half its health (was 35%). He is still the hardest boss; nothing he does reads differently.

**Eos's draws.** The scripted hero now plays Eos as he is meant to be played: a short string up close, then the
stance, let go at three marks with the boss in reach, or at once with a lit mark as a way out. Unhurtable and
with no boons it kills in 67 s on average against 94 s on the string alone, the fastest of the four, and in
full fights it is hit the least (2.0 a fight). The draw works; nothing about Eos was changed.

**The heroes:**

- Aster: sweep 18 (was 20), smash 36 (was 40), so a full charge is 65 (was 72) and its floor wave 18 (was 20);
  Starfall 42 (was 46). The charge still adds 80%, so holding the smash stays a little ahead of not holding it.
- Lune: two less health than the others (was one: 3 on Standard), arrows of 5, 6 and a piercing 13 (were 4, 5, 10).

Time to win, unhurtable, no boons, trial I (seconds, all seven bosses): Vesper 77, Aster 84 (was 74), Lune 90
(was 103), Eos 67 (draws). Full fights, 1,680 again (Kairo at 50%): overall 84%.

| Hero | Clear rate | was | Hits taken a fight | Weakest boss |
|---|---|---|---|---|
| Vesper | 86% | 85% | 2.6 | Kairo 47% |
| Aster | 86% | 90% | 3.3 | Kairo 43% |
| Lune | 71% | 71% | 2.9 | Kairo 33%, Warden 38%, Wolf 47% |
| Eos (now drawing) | 92% | 77% | 2.0 | Kairo 62% |

By boss: Mage 100, Leviathan 99, Assassin 98, Knight 93, Wolf 79, Warden 71, Kairo 46.

A correction found after: the scripted hero never pressed anything in the Last Wave's struggle, so it lost every
one (2 health, 3 when fierce) at the very end of the fight. Taught to mash at a person's pace (eight presses a
second), it beats Kairo **69%** of the time (240 fights; Vesper 77, Aster 60, Lune 60, Eos 80): level with the
Warden. The Kairo numbers above are from before this and read low.

**The defeat screen.** Its buttons are a little smaller and the result panels a little wider (900 px, as the
victory screen already was), so "Again, with Feather Cloak" fits on one line with the other two; they wrap
rather than spill out if a name is ever longer. The summary line no longer leaves a word alone on its last line,
and loses the double space when there is no last blow to name.

## Kairo, the Canyon Fist (v2.4a)

Asked for: the boss from the boss brief (the Claude Doc "Solfall boss brief"), with the parts left open
filled in and approved. A martial artist a head taller than the hero, on a ridge of rock above a canyon.
He comes to spar and ends up fighting for his life: each phase he powers up and takes you more
seriously. He is `js/kairo.js`, and brings his own backdrop, weather, sounds and music.

There are now seven bosses at the crossroads. A run is still six trials won, chosen from the portals,
so each run leaves one boss out; the portals were spaced closer to fit (`js/rest.js`).

| Phase | What he does | The tells |
|---|---|---|
| I · Sparring | Punch combos, the Sunwell Wave (a blue beam from both hands), Hailfire (8-12 energy balls from the air), the spin throw. Keep away and he flies at you knee first; ride over his head and he drives a palm straight up | Every combo opens the same way; the **third punch** shows the ending. Hips turning with a sharp breath: kicks (the last rises over your head; dash through to his back). A hand dropped glowing to his hip with a hum: a short beam. Nothing: he hops back, open. A leap with **open hands** is the throw: a dash does not save you, a jump over him does |
| II · Risen | A gold aura with lightning in it, everything faster. The Wave can **warp** behind you; combos can fire a one-hand beam; Flare Up (six seconds of blinks and a quarter more damage taken, then a gasp), Meteor Smash, Twin Comets. His heavy blows crack the ridge | Warp: the charge hum cuts off with a crack. Meteor Smash: a shadow grows where he will land (he is off screen, so the mark is fair) |
| III · Still Sky | He falls as if beaten and rises with half his health back, the phase marks gone from his bar, in a thin white aura. The **Gathered Sun** opens it. Standing still between attacks he slips blows to his front and answers with a palm. Empty Hand, the Sweeping Wave, Meteor Heel. Below 12%, once: the **Last Wave** | Empty Hand: eyes shut, nothing moving; strike him and he is behind you. Sweeping Wave: which hand is on top as he draws back says which way it sweeps (the lead hand: up) |

**The punch combos** (v2.4b) come out of wind-ups you can see: each punch starts with the fist drawn back,
the opener is measured, the middle ones quick, and the punch that shows the ending is held a beat longer. The
kick tell (hips turned, back heel up) is now drawn; before it was only the breath. The beam ending has a real
charge: he skids back off the last punch, sinks low with the glowing hand right back at his hip and light
drawn into it, a point of light at the hand, then the shot, which drives him back. In phase I he only ever
dashes in, never blinks, and his Wave never warps, even when fierce; his blows come a quarter slower than
before and he waits longer between attacks, like the Knight.

**Risen** (v2.4b): after the laugh he sinks low, fists clenched and shaking. The music falls away, stones lift
off the ridge and hang round him, dust is drawn in, and his heartbeat thumps through the air four times, each
sooner than the last. Then he throws his head back and the aura erupts over twice his height in a burst of
lightning, the hanging stones are blown across the canyon, the slab under him goes, and it roars on for a
second before settling into the burn he fights in.

**The Sunwell Wave** follows you until it holds, then plays out for most of a second; a dash alone does
not outlast it. Be in the air when it holds and it goes over you as you land, or get round behind him: it
only aims in front of him. If the orb pulses twice he is holding it.

**The ridge breaks.** The floor is eight slabs. His heavy blows crack them; in phase II a slab cracked three
times falls away and leaves a pit (never under you, never two side by side, never more than two, never the
slabs at the walls). Falling costs 2 health, and is death on Merciless, from the fifth trial on, and against
a corrupted Kairo. He opens phase II by breaking the slab under himself. In phase III only the Sun cracks
anything.

**The Gathered Sun.** One hand to the sky, the arena darkening towards his palm, and a Sun growing over him
for up to seven seconds. His stagger bar becomes the Sun's bar. Break it and he must throw it at once, at
the size it has reached: small, a dash clears its burst, and he kneels spent for three seconds; large, only
distance does. Left to grow, it covers the arena and kills outright. A hero with no boons striking without
pause breaks it in about four seconds.

**The Last Wave** cannot be dodged. You meet it with your weapon raised and the two push: every press of
attack pushes it back, and Dawnbreak, if ready, wins at once. Lose, and it is 2 health (3 when fierce) and a
combo. Win, and his own wave throws him down.

**Stagger** (*WINDED*): short, but blows deal 1.6x. Blows on his back, or while he is open after an attack,
build twice the stagger.

**Corrupted** he has three of his own: the Scorched Wave (low along the floor, leaving it burning in
lengths), the Black Sun (opens phase II: five seconds, smaller, red-black) and the Shadow Partner (a dark copy
repeats every blow of a combo from your other side half a second later; listen for a second set of footsteps).
Still Sky starts in phase II.

**Trophy:** Sparring Wraps: after a perfect dodge, your next attack blinks you behind the foe and deals 50%
more. **Feat:** Sunbreaker: break the Gathered Sun within three seconds.

**His music** is his own, written in code: D dorian, hand drums, a flute and plucked bass in phase I, taiko
and brass in II, a driving snare in III, and only a drone and a heartbeat while the Sun gathers.

**For other bosses**, the engine gained: pits in the floor (`G.arena.pits`, falling with `G.arena.fell()`),
holding the hero (`G.player.grabbed`, which can count presses for a struggle), a slow camera push-in
(`G.fx.cine`), a boss's own music (`B.music`, `B.bpm`), and hiding the phase marks (`B.unbound`).

**Checked:** every attack in every phase, and his three corrupted ones, run without errors for all four
heroes (`tools/boss-tests.js`, which now steps off open pits). The scripted player there loses 1-2 health
in most of his attacks, because it has no answer to them: no rule for beams across the floor (the Waves),
for a leap that must be jumped (the throw), for Empty Hand's rush, for striking the Black Sun, or for
pressing in the Last Wave. Each of those was then checked by hand with a scripted move: an early jump or
getting behind him beats the Wave; a jump as he leaps (not during his crouch) beats the throw; a dash or a
jump as his eyes open beats Empty Hand; steady blows break the Sun; pressing wins the Last Wave. His look,
the auras, the Sun, the Last Wave and the corrupted Shadow Partner were checked as still frames.
**Nobody has played him yet**, and his music has not been heard.

## Sets and crowns (v2.3a)

Asked for: boons that attach to the actions, and a new button "the crown action", unlocked by a full set.

**Four sets, four slots.** Sixteen new boons, four to a set, one for each slot: **Strike** (your
weapon), **Special**, **Dash** (a perfect dodge, or a dash along the ground) and **Mend** (when mending
ends). A slot holds one set boon; taking another for a full slot gives up the old one (the card says
"Replaces ..."). The other boons (Keen Edge, Steady Heart, the hero boons...) take no slot. An offering holds
two set boons, both from one set, chosen from a set you already hold three times in five, and one or more
ordinary boons. Each set leaves its own mark on the foe, drawn on it:

| Set | Its mark | Strike | Special | Dash | Mend | Crown |
|---|---|---|---|---|---|---|
| **Ember** | embers: up to 5, each burning 2 a second; one dies down every 1.6 s unless more are set; drawn as coals on the foe | Searing Edge: finishers set 2 | Kindled Star: sets 3 | Ashen Trail: a dash along the ground leaves fire on the floor for 1.5 s; the foe catches an ember from it | Hearthwave: a wave of heat, 3 embers on a foe within 300 | **Pyre**: every ember bursts for 16; then the weapon burns for 6 s and every blow sets one (a finisher two) |
| **Storm** | static: built by blows, held 2.5 s, then draining; at 10 a bolt strikes for 24; drawn as crackling arcs | Charged Edge: each blow 1, a finisher 2 | Thunderhead: a storm cloud over the foe strikes 4 times for 10, each building 2 | Lightning Step: a perfect dodge calls a bolt for 24 | Quickening: mending 30% quicker, and a bolt for 24 when it ends | **Thunderstep**: streak through the foe as lightning for 24 and out the far side, untouchable as you pass; press again to streak back, three times within 2 s |
| **Tide** | soaked: up to 3 layers for 4 s; the boss's whole clock (its moves and what it throws) runs 6% slower a layer; drawn as water dripping off it | Undercurrent: finishers soak | Breaking Wave: soaks twice, and washes away what the foe has thrown within 340 of you | Slack Water: a perfect dodge soaks, and the boss runs at half speed for 1 s | Tidewall: a wall of water that turns the next blow aside | **Undertow**: a wave across the arena knocks the foe down (staggered at once, which clears everything it had out), 20 damage, and soaks it fully |
| **Gloam** | a dark ring around the foe: the next finisher or special deals double and spends it; it returns 4 s later | Nightblade: a finisher that spends it gives back a third of a segment | Shadow Star: your special hits 30% harder and marks at once | Umbral Step: a perfect dodge marks at once, and its Riposte waits 3 s instead of 1.5 | Fade: you fade for 1.5 s and blows pass through you | **Nightfall**: the arena goes dark for 3 s (the foe, its warnings and you stay lit); every blow you land in the dark lands again when the light returns |

What counts: a *finisher* is the big blow of a string (Vesper's third cut, Aster's smash, Lune's heavy
arrow, Eos's gold draw). A *special* counts once a cast (all five of Moon Volley's arrows are one), and for
Eos it is Still Point turning a blow. A free shot (Mirror Step) is not the special.

**The crown.** Three boons of one set open its crown (only one set can, with four slots). It is a move on
its own key, **U** (rebindable in Settings, Controls), or **LT** on a gamepad (mend is on LB alone now).
Its bar sits under Dawnbreak in the set's colour, and it fills only from that set's mark doing its work:
each ember burning, static built and bolts struck, each second the foe is soaked, each mark spent. That is
about sixteen to twenty seconds of a set working. The charge carries over between trials like Dawnbreak, and starts
again at nothing when the crown changes. It cannot be used while the boss cannot be struck. On the road,
the third boon of a set lights the hero in the set's colour and says which crown is open; the Moves page
(Tab) and the pause menu describe it.

Each set and crown has its own sounds. All of it is in `js/sets.js`. The set boons are data in `run.js`
(`G.SETS`, and the boons with `set` and `slot`). The boss's damage calls `G.sets.amp` (the Gloam mark)
and `G.sets.dealt` (Nightfall's count). An ember burning hurts without a flinch, a number, stagger or the
boss's own reaction to a blow (`info.tick`). Soaking slows the boss's clock in `G.step` (`game.js`).

Measured in fights against the Knight (Vesper unless said):
- Embers set by a finisher string, burning 2 a second each and dying down one per 1.6 s.
- Pyre on five embers for 80.
- A static bolt after about 2.5 s of steady cutting.
- Thunderhead's cloud and bolt for 83 together with the lance.
- Thunderstep's three streaks for 91.
- Soak taking the boss's clock to 0.88 after a string, and Slack Water to 0.41.
- Undertow staggering the Knight and the Wolf.
- The Gloam mark doubling a finisher (26 to 52).
- Nightfall's dark answered with 135 after a 2.9 s string.
- Each mend boon working when mending ends.
- Aster's smash, Lune's heavy arrow and Eos's gold draw counted as finishers. Starfall, Moon Volley and
  Still Point counted once each as the special.
- What one Strike boon is worth, against a Knight held still, over 20 s of Vesper cutting:
  - nothing held: 49.8 a second;
  - Keen Edge: 63.3;
  - Charged Edge: 60.2;
  - Searing Edge: 59;
  - Nightblade: 57.5;
  - Undercurrent: 49.8 (it slows the foe instead).

  With three of a set, the crown came once in the 20 s (Storm 62.5, Gloam 66.5). Ember's took just over 20 s.
- `tools/boss-tests.js` with the scripted hero fighting back, a full set held and the crown fired whenever
  it was ready, against the Knight, the Leviathan, the Magus, the Wolf and the Veil. One run for each hero:
  Vesper Ember, Lune Storm, Aster Tide, Eos Gloam. No errors from the game.
  - Health lost over 548 runs: 88, 106, 111 and 81.
  - The tool cannot test the Warden: it reads `B.body`, which the Warden does not have. That is an old gap
    in the tool, not this change.
  - The Warden was fought by hand instead, 20 s with each set and its crown: no errors.

Not balanced by hand yet: these numbers are a first guess. A full set should beat Keen Edge, but not by a
mile.

## Hero boons, and who you meet on the road (v2.2a)

Asked for: hero-specific boons, "maybe 2 per character with a max of one appearing in a set of 3 boons",
and "events/random npcs that give stuff".

**Signature boons.** Each hero has two of their own (tag *Signature*, in the hero's colour). They are
offered only to that hero, and an offering never holds more than one hero boon (old or new). They change
how the hero plays rather than adding to a number (`player.js`, "signature boons"; each has its own sound).

| Hero | Boon | What it does |
|---|---|---|
| Vesper | Pinning Lance | A Star Lance that strikes stays fixed in the foe (drawn there, 8 s); her next finisher on it bursts the lance for 40. |
| Vesper | Constellation | Each finisher that lands sets a star on the foe; the third links them with lines of light and bursts for 60. |
| Aster | Fault Line | A fully charged smash cracks the floor where it lands; a second later the crack erupts for 45. |
| Aster | Unbroken | A blow taken while she charges the smash fills the charge at once, and the smash comes (she still takes the damage). |
| Lune | Splitting Arrow | The heavy arrow splits into three where it first strikes (each a fifth of its damage). |
| Lune | Moonglide | Holding the attack in the air, she falls slowly (at most 130 a second) while she fires. |
| Eos | Hanging Cut | The line of a full draw hangs in the air, shedding gold, and a second later cuts again for half. |
| Eos | Second Sun | After a full (gold) draw, the next hold within 3 s starts at two marks. |

Through-Thrust, first pitched for Vesper, was swapped for Constellation at the user's word.

**Who you meet on the road.** On a little over half the roads (55%), between the fountain and the portals,
someone is waiting; never the same one two roads running, and none once the run is won or on the road of
spoils after a corrupted portal (`rest.js`, "who you meet on the road"). The road is 360 wider for it.

- **The fortune-teller.** Three face-down cards on a cloth: one is a boon (not on the offering), one 40
  Sunshards, one a corrupted boon. Turn one; the others turn over after it so you see what you missed.
- **The wandering smith.** Hammering at an anvil by a small forge. For Sunshards he tempers a boon you
  hold: one more of it, even one past its limit (Keen Edge ×4, Steady Heart ×4...). Only boons that grow
  with each one held (a limit of 2 or more) can be tempered. 50 Sunshards, then twice the last each time
  in a run. Its own panel, like the fountain's.
- **The omen altar.** A black altar with an omen's flame over it. Pledge yourself: one omen more walks
  with you into the next trial, and you take a second boon from this offering ("choose two").
- **The duelling shade.** A shade of the Veil's kneels in a ring of blades. Ask for the duel and it fades
  in around you, sets itself to dash, sets its aim on your spot 0.15 s before it goes, and dashes there,
  six times at most (from the third, sometimes out of the air). Strike it three times before its blade
  touches you and it leaves a relic you do not hold (60 Sunshards if there is none). Touched, the duel is
  lost: you are knocked back but not hurt (nothing on the road can hurt you). Struck, it is gone at once
  and comes again from somewhere else; a dash through it is a dodge.

Also: standing at the fire, the fountain or another place no longer draws its small name over the label.

Measured: each boon tested in a fight against the Knight (Constellation's third finisher 60, the pinned
lance 40, the crack 45, Unbroken's smash 0.15 s after the blow instead of 0.77, Moonglide's fall 1.1 s
instead of 0.3, the hanging cut 50 after a 100 draw, Second Sun's hold at two marks in 0.25 s).
`tools/boss-tests.js` with the scripted hero fighting back and all eight boons held, against the Knight and
the Magus: no errors, and the same health lost as without them (Vesper 35, Lune 50 against 49, over 194
runs). Each event played through on the road: the duel won by all four heroes by stepping off the aimed
spot and striking in its recovery, and lost on the first dash by a hero who stands still.

## The Veil's Echo, reworked (v2.1c)

The Echo used to set the hero's own shadow running the path they took, a second behind; it felt "a bit
weird". Now, as asked: the Veil kneels at the far wall and channels, and its shadows come out at different
places, each preps for half a second and dashes to where the hero was standing, so the hero has to keep
moving. The channel cannot be broken, but the Veil can be struck all through it.

- **The channel.** It kneels with its blades crossed upright before its face, and the dark is drawn up out
  of the floor into it (its own sound, `veilchannel`). Blows land as usual; none stops the working, and a
  stagger earned in it waits for the first blow after it (`B.steadfast`, read in `bosskit.js`). After it
  the Veil is spent and slow to rise, open for 0.9 s.
- **The shadows.** Each fades in (no burst of smoke) around the hero, on the floor or hanging in the air,
  and sets itself low to dash, blade forward, its eye on the hero. 0.15 s before it goes, the blade catches
  the light and its aim sets on the spot the hero is in (in the air too). It dashes straight there, laid
  along the line, stops on the spot and fades. A hero who has moved on is not touched; one still there is.
  No line is drawn: the shadow set to go is the warning. A shadow can be struck down while it waits.
- **By phase.** I: three, one after another (0.85 s apart). II: four, 0.62 s apart, one of them out of the
  air. III: one, then two at once from either side, one out of the air, and the last is the Veil itself:
  the kneeling figure goes to smoke, it comes as the shadows do, and it stays where it stops, open.

Measured: `tools/boss-tests.js` (its scripted hero steps off each shadow's spot) loses 3 to the Echo over
30 runs across five seeds, and the Veil as a whole 1 over 92, as before. Twelve heavy blows into the
channel (five times what staggers it) do not break it; the next blow after it staggers.

## Hitboxes, tuned to what is drawn (v2.1b)

Asked for: "make sure all hitboxes are finely tuned to what they should be for both players and bosses".
A new tool, `tools/hitbox-check.js`, plays every attack and puts the hero at every spot in the arena to see
where it would be hit, then measures how far each hit can come from anything drawn; it does the same for
what of each boss can be struck, and for each hero's box, cuts and shots. What it found, and what changed:

- **The heroes' cuts.** Each cut is drawn as a tall crescent, but struck only within a box at chest height:
  the top of the crescent passed through a foe overhead (the Warden's core, the Leviathan's head) and did
  nothing. A cut along the side now strikes along its whole crescent, above and below the box
  (`atkBoxes` in `player.js`), and the up and down cuts are as wide as the crescents drawn for them.
  The crescent wave (Vesper's, and the Crescent boons) struck with a small square behind its arc; it now
  strikes with the arc.
- **Every boss's sword swings** (`H.arc`) cut their whole slice from the first frame, ahead of the drawn
  blade; they now cut only as far round as the crescent has come, just behind its tapering tip. Pools burn
  only as high as their flames stand, blasts stop once they have burned away, a meteor's landing grows with
  its ring, columns and tides grow with their drawing, and a ring stops cutting once it has faded.
- **Each boss** (each had its own pass):
  - *The Wolf*: what can be struck now follows its pose, and its neck and head can be struck (they could not);
    its body in flight hurts along its spine, not through the air under its belly; its breath, tail, fires
    and pack hurt only where and while they are drawn.
  - *The Leviathan*: its head's box is drawn round the skull, jaw and teeth (45 px of jaw could not be
    struck); spouts, the maw, the tail's fall, barnacle spines, the breaker and the hydra's heads hurt only
    where they are drawn (several hit to the sky from their first frame).
  - *The Veil*: what can be struck follows its pose (crouched, dashing, laid out, in the air), for its
    shadows too; Moonfall's blades no longer cut far above themselves; its landing cuts only as high as it
    lies.
  - *The Knight*: a row of grave-blades cuts only where a blade stands, as high as it has risen; its spin
    and its slams hurt only as high as they are drawn.
  - *The Magus*: rime and frost spikes, the firewall, the storm cloud and the Foresight burst hurt only where
    they are drawn; what can be struck follows its recoil and lean and reaches its hat.
  - *The Warden*: the whole drawn core can be struck (its rim was out of reach) and the hands' boxes take in
    the thumb and fingertips; its landings, the clap, Flare, the sunspot and the spears hurt only where they
    are drawn.
- **Left as they are, on purpose**: a swing still cuts near the hilt, inside its drawn crescent, so nobody can
  stand pressed against a boss and never be hit; the Magus's lightning cuts the whole column its warning
  marked; a spinning blade cuts all round it.

Measured: `tools/boss-tests.js` loses 10 over 446 runs (11 before); with the scripted hero fighting as Eos,
79 (103 before: fairer hits, and a little more of each boss to strike); `tools/dodge-tests.js` passes all
136.

## Eos, sharpened (v2.1b)

After playing v2.1a: Eos "feels kinda weak". What made him so: "no attack string, just simple left
clicks", the charge took too long, he was slow, his counter was unreliable, and foes that fly or sit high
(the Warden's core, the Leviathan's head) were rough. Measured, his presses dealt about 30 a second against
the others' 40-55, and a full draw took 1.5 s of standing still on the ground.

- **A string.** Presses now chain three different cuts, as the others' do: a rising cut out of the sheath
  (11), a falling cut back across along its weight (13), and a wide finisher drawn low behind him that
  sweeps up and over and steps in (27, gold). Holding the button after any of them is still the stance.
  Measured against a boss standing still: 42 a second (Vesper 39, Aster 57 in the same test).
- **Faster Focus.** The three marks come at 0.3, 0.65 and 1.05 s (from 0.45, 0.95 and 1.5), and he walks
  faster while holding the stance (62% of his speed, from 45%). He also runs a little faster (338).
  Back-to-back full draws: 45 a second.
- **The stance in the air.** Holding the attack in the air sets the stance there too: he drifts down
  slowly while Focus gathers (a little slower than on the ground), for about a second each jump, and a
  draw from the air carries a quarter further. A jump and two marks drawn upward now reaches the Warden's
  core in every phase (69 to the core).
- **Still Point** waits two thirds of a second for a blow (from 0.45 s), so a delayed blow can still be
  turned; if nothing comes, half its Starlight comes back.
- **The string charges the sheath.** Each cut of the string that lands is a mark: hit, hit and hold starts
  the stance at two marks and gathers on to the third; all three landed and hold is the gold mark at once.
  The marks light once the button has stayed down 0.17 s after the press, so tapping is still just the
  string. A cut that misses lights nothing, and a draw or a hit taken spends them. Against a boss standing
  still, three cuts into a gold draw, over and over, does 75 a second (58 without the marks; the string
  alone 50, Aster's 58 and Vesper's 46 in the same test).

Measured: `tools/dodge-tests.js` as Eos passes all 136; `tools/boss-tests.js` with the scripted hero
fighting as Eos loses 104 over 446 runs, against 106 before the change (that mode stays close to hit,
so it always loses more), so the step-in finisher does not get him hit more.

## What the great bosses do (v2.1a)

A study of how bosses work in Hollow Knight, Dark Souls, Sekiro, Elden Ring, Dead Cells and Cuphead
(`docs/boss-study.md`), and new moves for every boss built from what it found. Nothing is copied: each
idea is a principle, and every move is told through that boss's own body.

What the study found, and what each boss now does with it:

- **Nowhere to hide on its head.** Riding over a boss's head (standing on it, hopping on it, or waiting on
  a ledge just above) for about 1.4 s now brings that boss's own answer, cast at where you are: staying up
  there does not escape it, moving off does (`B.above` / `B.antiAir` in `js/bosskit.js`; the Warden's own
  in `js/boss.js`).
- **Delays and branches.** Old moves gained a held or branching form, told by a small difference in the
  body, so a reflex dodge on the usual beat is not enough.
- **Pressure.** Each boss has a chain that chases you and ends in a committal blow.
- **Punish windows.** Big moves now end stuck, dazed or spent for a clear moment.
- **Projectiles that behave differently**: rolling, bouncing, mines, homing, splitting, thread traps.
- **Spectacle that asks something**: a wall or a field with a gap to find and keep with.

| Boss | Over its head | New moves | Reworked |
|---|---|---|---|
| Cinder Wolf | **Skysnap**: ears up, head to the sky, it leaps jaws-first up through you (or, with you just over its back, rolls over and rakes the air) | **Harry**: one snort per bound, snapping bounds that chase you, then jaws buried in the floor. **Cinders**: head down, coals roll along the floor and back off the wall (jump the clump); head thrown up, they bounce down (cut them). **Blaze**: up on the rock, fire runs across the floor; sitting and howling, the gap is in front of it; slamming the rock, it is at the walls | **Pounce**: a held form, mane sunk and tail clamped still. **Bite**: a third snap from phase II |
| Drowned Leviathan | **Breach**: the ground under you heaves and follows, locks, and it bursts up through it | **Barnacles**: spiked mines that stick and burst (scattered, or in a line toward you). **Thrash**: 3-5 chained bites, snout down for low, head cocked for high, the last buries its jaws. **Gyre**: it coils round the bay and spouts tear up everywhere but one moving gap | **Lunge**: a late form, gills pumping. Afterwards its chin lies winded. **Snap**: bites again while you stay in front |
| Silent Veil | **Skyhook**: it looks up, appears over you and drops heel-first, or cuts straight up from a deep crouch | **Snare**: knives strung with thread that tightens and snaps (underhand low, overhand high). **Dance**: one blade-tap per cut, then dash-cuts that chase you, then it kneels open. **Moonfall**: the dark comes down and crescents of falling blades sweep across with a low or high gap | **Lunge**: a feint, weight back, that stops short, hops back and throws knives. **Flurry**: a third cut held high behind its head |
| Unburied Knight | **Skyward**: visor up, a rising cut through the air above it, or grave-blades up through you | **March**: a combo that carries on while you are in reach (a long stride means another cut, feet set wide the finisher, which buries the blade). **Souls**: flames that follow you, stop and split into shards. **Tolling**: rows of grave-blades too tall to jump, each with one gap | **Overhead**: a delayed form, blade further back, visor flickering; every overhead now strains to pull free. **Cleave**: turns and sweeps behind it if you went through |
| Threefold Magus | **Spire**: a rune follows you near the top of the screen, then a bolt comes down the column and frost spears up | **Motes**: homing orbs (ice splinters when cut; lightning climbs over you and strikes). **Blinkfall**: its robe flickers where it will appear, then it drops staff-first, 2-4 times, and slumps dizzy. **Glacier**: a wall of ice spears with a gap the staff points to | **Fireball**: a smouldering form (a dark coal) that bursts late and wide. **Bolts**: fork onto you if you stand still |
| Eclipsed Warden | **Corona**: light gathers on the core's crown, then a fan of rays fires up through you | **Spears**: a rank of spears crosses with a gap where the core sits (low or high). **Charge**: one eye-blink per rush, the core rushes you and lies dazed. **Orbit**: embers circle the core and are flung one by one (slow) or all at once (fast) | **Slam**: a delayed form; fists stay stuck longer and strain. **Sweep**: rolls off the wall and comes back if you jumped it |

As before, phases I and II are about as hard as each boss's other moves and phase III pushes harder.

Measured (Vesper, seed 1): `tools/boss-tests.js` loses 11 over 446 runs: the 9 it lost before (one of them,
the Leviathan's phase III Slam, now lands on seed 1 because the bigger bags change the draws), plus 2 in the
Wolf's phase III Harry, where the scripted player only walks away from bounds a player has to go through or
over. Every new move loses 0 in phases I and II. The scripted player now jumps rolling coals instead of
running from them. `tools/dodge-tests.js` passes all 136 (47 new). Each boss's anti-air fires in all three
phases with a hero kept over its head. Not yet checked by play: how well each new tell reads at full speed.

## Two new moves for every boss (v2.0a)

Every boss has two new attacks in all three of its phases, so a phase I fight has more to read and the
moves you learn early carry on to the end. Each has two forms told by the body, grows in phase II, and
pushes harder in phase III; in phases I and II they are about as hard as the boss's other attacks.

| Boss | Move | The tell | What later phases add |
|---|---|---|---|
| Cinder Wolf | Prowl: a feint dart | One forepaw scrape: a low dart through you (jump or dash). Two: it stops short, leaps over you and bites back from behind | II: the ground it starts from burns. III: it darts back across, faster |
| | Shake: embers flung off its mane | Whole body shaking, tail whipping: embers land far out, stand close. Head and shoulders only: they land around it, get away | II: where they land burns. III: two shakes, the second the other form |
| Drowned Leviathan | Breaker: a wave across the shore | The sea drawn far back: a tall breaker, dash through it. A short draw: a low swell, jump it | II: a second wave from the other wall. III: three, each with its own draw |
| | Jet: a sweeping jet of brine | Head reared: down from the sky to the far wall, then in along the floor (get under its chin). Head low: a swell along the floor (jump), then a level jet over your head (stay down) | II: the jet pans back out. III: spouts where it strikes |
| Silent Veil | Stance: blades sheathed, still | Strike it and it catches the blow, vanishes and cuts through you (step off the line). Wait: a low grip lunges low (jump), a high grip crosses at leaping height (stay down) | II: a shadow takes the stance on your other side. III: a second draw back the other way |
| | Crescent: a blade that flies out and comes back | Overhand: out high, back low (jump on the return). Sidearm: out low, back high | II: a shadow throws a mirrored one. III: it catches and throws again at once |
| Unburied Knight | Heel: a cut behind it | It glances over its shoulder. Blade low: a sweep along the floor (jump). Blade on the shoulder: a backhand at chest height (stay down). It comes on its own if you stay at its back | II: its ghost repeats it. III: straight into an overhead |
| | Thrust: a lunging stab, point first | Drawn back at the hip: low (jump). At the shoulder: high (stay down, or dash through) | II: a ghostly lance flies on to the wall. III: two thrusts, read the re-draw |
| Threefold Magus | Nova: the answer to a hero at its side | Staff low, frost creeping: a ring of frost runs both ways (jump). Staff raised, spinning: a tall lightning dome (get out sideways) | II: one of each. III: the second follows almost at once |
| | Serpent: fire that slithers after you | One slow turn of the staff: one long serpent. Quick circles: two short fast ones. Jump them or cut them | II: burning ground behind. III: the long one splits, the brood is three |
| Eclipsed Warden | Flare: a lash of fire from the core | The corona bulges low: the lash runs along the floor (jump). High: it hangs over you and cracks down (step out once it locks) | II: both sides. III: a second rake, or a wave and burning floor |
| | Sunspot: dark orbs torn off the core | Spots scattered: several light orbs dive on marks (keep moving). Gathered into one: one heavy orb bursts for 2 (walk clear or dash through) | III: every orb bounces once |

The Warden's two come from the core, since it crushes its own hands in phase III. Every new move moves
like the boss it belongs to and has its own way back to rest; each has its own sounds.

Measured: `tools/boss-tests.js` (seed 1, Vesper) loses 8 over 356 runs, the same 8 in the same old attacks
as before, and 0 in the new moves; `tools/dodge-tests.js` passes all 89 (37 of them new, for Flare and
Sunspot). `tools/motion-check.js` flags 8 frames in the new moves, all of kinds the old attacks show too
(an orb bursting, a blink, a staff stopped dead in the floor, a dive under the water).

## The Wolf fights like an animal (v1.9d)

v1.9c gave the Cinder Wolf a living walk and stance, but its attacks were still poses held stock-still
through their warning and then snapped to, or a body slid at an even speed. Now every attack moves
through the body (`js/wolf.js`: an attack adds to its pose each frame through `hold`, `coil` and `thump`):

- **Wind-ups build.** Through a warning the haunches keep sinking, the shoulders draw back, the head drops
  and the ears flatten, and in the last part a tremble runs through it and the tail lashes. A long
  pounce coils deeper than a short one, so the tell is still the depth of the crouch.
- **Weight arrives.** It leaves the ground stretched long off its hind legs; it lands with a squash and
  rocks nose-down over the forepaws that took the weight, then back past level. Landing from a wall
  dive or the Emberfall hits hardest.
- **Bite.** It rocks back onto its haunches with its jaws parting, drives in head-first with the body
  following, and shakes its head hard as the jaws close. The high bite rises on its haunches, head
  cocked back, and the snap jerks its head down.
- **Sweep.** Its weight pours onto the forelegs and the tail climbs; the hindquarters swing up and round
  and come down.
- **Rake.** Up on its hind legs it paws at the air, swaying and leaning further back as it gathers; the
  slam lands with its weight, and it heaves itself back up.
- **Howl.** It draws the breath first, holds the cry with its head quivering and jaw working, then lets
  its head sink while its chest heaves.
- **Breath.** Its chest fills and its head draws back; then, pushed back on its legs and shuddering, its
  head follows its own fire down the floor and out to the wall.
- **Moving.** It skids to a stop out of a gallop (braced forepaws, dust) instead of halting dead, ending
  about where it used to stop. Its sprint at the wall builds up, it springs onto the wall and kicks off it (it used to
  appear on it, and leave it, in one frame), and its legs keep time with its climb.

Every hit area and timing is as it was: `tools/boss-tests.js` loses the same on the Wolf as before.

## Motion that turns, rolls and fades (v1.9c)

A pass over how everything moves, measured rather than guessed: `tools/motion-check.js` draws the hero,
each boss and each hazard alone, frame by frame, and flags any frame that changes far more than the
frames around it (a pop), a pose that shows for a single frame (a flicker), a fast movement that stops
in one frame, and a hazard drawn whole on its first or last frame. It found and this build fixes:

- **Bosses turned by flipping in one frame.** The Magus, the Veil and the Knight now turn: the figure
  narrows through the turn and opens out the other way, eased in and out over about a sixth of a second
  (`K.turn` / `K.faceX` in `js/bosskit.js`). The Wolf already turned this way, more slowly.
- **The hero's turn was a flip too** (narrowed a little, but mirrored in one frame, so Aster's maul jumped
  from back to front). Now the same kind of turn, over about five frames; a swing or a dash still shows at
  once, the right way round.
- **The Leviathan's head jumped to its other side** whenever it passed upright (its lure leaping across).
  It now rolls over through a few frames. And in its third-phase swim round the arena it reversed in one
  frame at each end: it now rears up and swings round as it turns.
- **The Veil went out like a light**, and came back whole. She now thins into her smoke and gathers out
  of it, scarf and all.
- **A blast sat still and then was gone.** The burst now flashes outward and burns away over its moment.
  The Magus's firewall surges up out of the wall instead of appearing whole.

**The Cinder Wolf moved like a machine**, so it got a pass of its own (`js/wolf.js`):

- *Its legs keep time with the ground.* The walk and the gallop advance by the distance the body covers,
  so a paw in its stance stays put instead of skating (its stalking walk stepped far too slowly for its
  speed). Closing in at more than a walking pace, it gallops.
- *It builds up speed.* Moving in, it starts from whatever it was doing and accelerates; stalking, it eases
  into the walk and out of it.
- *Not every part arrives together.* Each part follows its pose on its own spring: the legs lead, the head
  comes a beat behind, and the tail and ears trail and swing past.
- *Its paws are planted.* On the ground a paw stays where it was set down while the body shifts over it,
  and steps (with a little lift, never both of a pair at once) when it is stretched too far or a new stance
  wants it elsewhere. In a lunge the hind paws push off and catch up.
- *Standing, it is alive:* slow heavy breaths, its weight rocking between its legs, its head following
  you up and down, an ear flicking now and then, its jaw trembling while it snarls.

None of this moves a hit area: every bite, sweep and leap still hurts exactly where and when it did.
(The stalking walk's ease is kept quick on purpose: a slower one left the Wolf standing somewhere else
when its next attack began, and the scripted player in `tools/boss-tests.js` showed the difference.)

**Heroes no longer borrow boss sounds.** Eos's fully drawn cut landed with the bosses' heavy `slam`, and
Aster's smash gathered with the bosses' rising `charge` tell, so both could be mistaken for an attack
coming at you. Eos now has `iai` (a thin steel ring over torn air, with a short firm weight under it) and
Aster `heave` (a brighter, shimmering hum up the haft), in `js/audio.js`.

Checked and left alone, because they are meant: a struck boss's shiver; the Magus's teleport fade; the
jump's stretch on take-off; Eos's draw, which stops as fast as it starts; warnings that go out as their
blow lands; waves and orbs that break with a burst.

## Corrupted for real: twelve new attacks, a pitch-black look, and corrupted boons (v1.9b)

**A corrupted boss is pitch black.** It is drawn as a black shape of itself with a thin, flickering
crimson edge, and only its brightest parts burn through it in crimson: the Warden's dark sun and
the eyes in its hands, the Magus's staff, the Leviathan's lure and teeth, a hit's flash. Crimson
lightning crackles off it all the time, now and then striking the ground or (on the Warden) jumping
between its core and hands. The dark aura, the black motes, the two torn shadows and the sideways
tear are kept. Nothing in it is bright except thin lines. A boss can keep scenery out of the black
shape (`B.corruptBehind` / `B.corruptFront`, used by the Leviathan for its flotsam, wave and surge) and
draw other parts of itself black with `G.corrupt.silhouette` (its coils far out in the sea).

**Each boss has two attacks only its corrupted self uses**, none of them a mechanic the game had before.
The first is in every phase and opens the fight; the second joins in phase II and opens it.

| Boss | From phase I | From phase II |
|---|---|---|
| The Warden | **Afterhands**: its eye shuts and its hands sink flat into the floor; void handprints bloom where you stood a moment ago, following you, and then fists punch up from each in the order they were laid. Keep moving; never double back. | **Pendulum**: a void chain takes the core, the hands haul it back with a creak, and it swings across the arena three or four times, faster each time, low at the bottom and high at the ends, throwing embers; then it hangs over one end and slams down. Dash or double-jump through it at the bottom. |
| The Magus | **Black Sun**: staff raised in both hands, its three lights going out; a black sun rises and void pours down in columns over the whole floor but one gap of light, which slides and turns (the corona swells before a turn). Walk with the light. | **Foresight**: its head tracks you and its eyes narrow to a slit; a crimson thread runs to where you *will* be, then a black spear flies down it. Stop, turn or dash the other way. |
| The Veil | **Past Self**: she pins your shadow with her blade and it tears loose as a black copy of you that repeats everything you did 1.2 seconds ago, swings included (two copies in phase III), while she lobs knives. Don't go back the way you came. | **Threads**: hands drawn back with strings between the fingers; a pin is thrown into the floor and its thread ties you to it, and she cuts across the circle it allows. Cut the pin (it throws her down, open), dash as the thread lashes, or dodge inside the circle. |
| The Knight | **Requiem**: the music drops out and his blade goes black; he makes four to six silent cuts through empty air, each leaving a crimson tear hanging, then all open at once (sword planted) or one by one, last first (sword shouldered). | **Colossus**: he kneels, sword raised point up; a giant void sword gathers above, follows you, plunges into the floor, then creaks over and falls like a felled tree. Dodge the plunge, then get to the side it is not leaning toward. |
| The Wolf | **Pack**: its fire goes black and it leaps to a crag at the back to howl; crimson eyes open at the arena's edges (low for a runner, high for a leaper) and shadow wolves run across one after another. Jump or dash runners, stay under leapers. | **Ricochet**: it crouches, spine arched, and spins once as its fire goes black, then becomes a void comet bouncing off floor, walls and sky in straight lines, the next line drawn faintly before it is travelled. Be off the next line. |
| The Leviathan | **Hydra**: its throat swells black and a crimson crack beats in the floor; a second head of void tears up on your other side and the two bite in turn, then both at once, stopping a stride apart. Step into the ground the last bite left; for the last, stand between. | **Undertow**: head flat at the wall, jaw unhinged, gills pumping: the floor floods black and runs toward it, dragging you, with void mines riding the current; then it rears and its jaws close over the near side. Walk against it, cut the mines, be clear when it closes. |

Every one was stepped through frame by frame for clean motion (no popping, snapping or sliding; tells,
wind-ups and returns to rest in each boss's own manner), and passes the scripted player in
`tools/boss-tests.js` (the Warden's in `tools/dodge-tests.js`, now 52 tests) without losing health.

**Corrupted boons.** Eight crimson boons, far stronger than the rest, each with a drawback written under
it ("But: ..."). Once a boss has fallen, a corrupted boon takes one card's place on two offers in five.
It does not show itself at first: each is a twisted form of an ordinary boon (Bloodied Edge of Keen
Edge, Hollow Crown of Steady Heart, Void Step of Twin Dash, Starving Star of Bright Vein, Whispering Dark
of Long Reach, Borrowed Time of Second Dawn, Feral Rhythm of Quick Hands, Ravenous Light of Swift Mend),
and it stands on its plinth looking like that boon. When you come near the offering (or after a few
seconds on the road) the corruption takes it: its light stutters, crimson cracks run out from the stone,
its white heart darkens and it shakes harder, and then
it breaks with a crack and re-forms crimson and black-hearted, with lightning round it. Nothing can be
taken from it while it turns, and its card only appears once it has. A redrawn offering hides its
corrupted boon again. The plinths carry no names: a boon is read on its card, by standing at it.

| Boon | What it gives | Its drawback |
|---|---|---|
| Bloodied Edge | Weapon damage +60% | Every blow you take costs one more health |
| Hollow Crown | Three more health | You cannot mend |
| Void Step | Dashes recover twice as fast; a dash through the boss cuts it for 40 | Where a dash begins, the floor tears and bursts a moment later |
| Starving Star | Starlight fills twice as fast | Land no blow for three seconds and your Starlight drains |
| Whispering Dark | Everything you do deals 30% more | Every 16 to 26 seconds the ground under you is marked, and bursts |
| Borrowed Time | Once per trial, a killing blow leaves you on 2 health and throws the boss down | After two minutes in a fight, the void takes a health every eight seconds (never the last) |
| Feral Rhythm | Attack 35% faster | A blow you take empties your Starlight |
| Ravenous Light | Every twelfth blow you land mends one health | Each blow you take gives the boss back 4% of its health (never past the top of its phase) |

**The Cleansing Fountain** stands at the crossroads, between the offering and the portals: a stone basin
of pale water under a hooded figure, with crimson threads in the water while you carry a drawback.
Press E at it to choose a corrupted boon and purge its drawback, keeping the rest. It costs Sunshards:
40 the first time in a run, then 80, 160 and so on. A cleansed boon shows pale in the HUD and
"(cleansed)" in the pause menu.

## Portals, and corruption (v1.9a)

**You choose the road.** The first trial of a run is still drawn at random, but after that the road
between trials ends at **the crossroads**: a portal for every boss, standing in a row past the
offering. Take a boon from the offering, then walk into the portal of the boss you want to fight next
and press E. A beaten boss's portal is stopped with a cracked slab. The victory screen still never
names the next foe, because you pick it.

**The seventh portal** stands at the far end, taller than the others, with six sockets round its
arch that light as you beat each boss. It is dormant: the final fight is still to come. Once all six
are beaten it stirs, with a pale light behind a crack in it, but it does not open (not yet).

**Corrupted portals.** After a normal victory there is a 30% chance that the portal of a boss you
have already beaten turns **corrupted** (never the one just beaten, at most two waiting at once, each
boss at most once a run, and only once two are beaten). The victory screen says so. A corrupted portal
is a hole of void rimmed in blood, its rings turning the wrong way, with a red eye in it that blinks.

A corrupted fight is **optional** and does not count as a trial: a run is won with or without it, and
the portals stay open after trial VI if you want them. The boss is far stronger: half again the
health, warnings 15% shorter, 22% less rest, its Merciless patterns, and always two omens. It also
looks plainly wrong: its arena and colours are drained to void and crimson, a dark aura with a
crimson edge that will not settle surrounds it, black motes bleed off it, two torn afterimages (one
cold, one blood-red) drift off its outline, and every second or two the whole figure jerks sideways.
Its bar reads *Corrupted* in crimson.

Winning it **cleanses** the portal (sealed for good) and pays **three times the Sunshards** and a
**second relic**: the plinths on the road offer three relics you do not hold instead of boons. The
second relic shows beside the first in the fight and the pause menu. Falling in a corrupted fight
ends the run like any other fall: that is the price.

Once the run is won, the broken arch you came in by glows gold: walk back to it for **the way home**.

## No banners (v1.8c)

The row of boss banners before the gate is gone. Who you practise against is now the first row of the
Proving Ring's own menu (left / right to change it), and the ring's label shows your record against
that foe.

## The road between, pairs you can read, and two new bosses (v1.8b)

**Six bosses.** The Cinder Wolf (`js/wolf.js`) and the Drowned Leviathan (`js/leviathan.js`) join the
four, so every run now meets each of the six once, in an order you never know (see "The bosses" below).
Each has a feat on the Tally (*Floored*, *Hold fast*) and a trophy relic: **Cinder Pelt** (a dash fills
Starlight as a hit does, and dashes recover 20% faster) and **Drowned Pearl** (one more health, and
Starlight fills 25% faster). A boss file now brings its own palette,
skyline painter (`G.SCENES`), weather, platform layouts and sounds (`G.audio.define`), and adds itself
to `G.BOSS_IDS`, so a boss can be added without touching the shared files.


**A rest between trials, instead of a menu.** After a victory the result screen shows your grade and
then *Rest, and choose a boon*, which takes you out onto **the road between** (`js/rest.js`): a short
night road with a fire, the boons on offer turning over their plinths, and a gate onward.

- Walk up to a plinth and its boon appears as a card at the top of the view; **E** takes it. It
  works at once, so you feel it before the next fight. One boon per rest.
- **Second Thoughts** (the Shrine's redraw) is a standing stone on the road, there while you have
  redraws left and have not yet taken a boon.
- **The road on** stays dark until you have taken a boon, then opens onto the next trial. It never
  says who waits there.
- Nothing on the road can hurt you; Esc pauses as anywhere else, and *Return to camp* ends the run.
- The Dawnbreak meter carries over through the rest, as it did before.

**Pairs, underlined.** Every boon that belongs to a pair names it in its text, underlined in gold:
*"Pairs with Comet Step: Shooting Star"*, or, once you hold the other half, *"With your Twin Dash, it
opens the pair Shooting Star"*. Hover the name for a tooltip with the pair's effect (with a gamepad the
tooltip shows on the focused card). The same notes appear on the road's cards and in the pause menu's
list of what you carry.

## A run with a shape, and boons that pair (v1.8a)

**A run is six fights, and you never know the order.** The bosses are drawn at random when the run
starts and you meet each one when the gate opens on it: the victory screen no longer names who is
next, and you choose who to practise against only in the Proving Ring's menu. A seventh
fight, always the same final one, is planned and not built yet, so for now **winning the sixth fight
wins the run**: the victory screen says *The run is won*, offers no boon, and sends you back to camp.
The gate counts the runs you have won on each difficulty.

There are only four bosses so far, so fights five and six are two of them met a second time (never the
one you just beat), in their Merciless form as before. Once there are six bosses, each run will meet
all six once.

**Pairs.** Six gold boons are offered only once you hold both of the two boons each one joins. When
one is open to you, it takes the place of one card on half the offers. A card that would open a pair
with a boon you already hold says so, so a build can be steered towards one.

| Pair | Joins | Effect |
|---|---|---|
| Shooting Star | Twin Dash + Comet Step | Comet Step cuts twice as hard, and a dash that cuts has no wait after it and gives your air dashes back |
| Tidecutter | Crescent + Long Reach | Crescent waves fly twice as far and hit twice as hard |
| Wellspring | Bright Vein + Fourth Star | a perfect dodge fills a whole segment of Starlight |
| Ember Ward | Swift Mend + Steady Heart | mending also wards you: the next blow within 4 seconds is turned aside |
| Dying Light | Second Dawn + Glass Star | when Second Dawn saves you, the boss is thrown down at once |
| Edge of Day | Keen Edge + Quick Hands | finishers deal 60% more |

Measured: each pair was taken and its effect checked in the running game (Comet Step 24 to 48, Crescent
wave 16 to 32 and twice the flight, finisher 42 to 84 with Keen Edge and Edge of Day together).

## The last blow, and a relic you keep (v1.7d)

**At nothing, the boss topples, and the ending is yours.** When a boss's health runs out it does not
die yet: it goes down in its own way (the Warden's eclipse sinks to the floor with its hands either
side, the Magus falls out of the air, the Veil is thrown into a wall, the Knight is disarmed) and stays
down. Blows still in the air as it falls pass through. Once it is down:

- **Press E (the heal button; LB on a gamepad) within reach of it** for your hero's finishing blow. A key
  cap floats over the boss, faint while you are too far away and lit when you are close enough.
- **Hit it any other way** and the fight ends plainly, with the old single cut and no finisher.

The fight's timer stops when it topples, so taking your time costs nothing; it cannot hurt you while down.

**Every hero finishes it their own way.** The arena goes dark, and the boss's own death, the shaking
apart and the burst, waits until the hero is done (`js/finish.js`).

| Hero | The finishing blow |
|---|---|
| Vesper | Three passes through it, too fast to follow, each leaving a thin line hanging in the air. She lands on the far side with her back to it, flicks the blade, and the lines flare one after another into a star. |
| Aster | She sinks, leaps off the top of the screen, and for a moment there is only a star over the boss. Then she comes down through it into the floor, and the floor splits from wall to wall. |
| Lune | She springs back to the far side, kneels, and draws while the light of the arena runs into the arrow. One point of light crosses the arena and pins it; a beat later it comes apart around the arrow. |
| Eos | His marks come up one by one in the dark. He never seems to move: there is a line through the boss and he is on the other side of it. The blade goes home slowly, and on the click the picture splits along the line. |

A Dawnbreak that empties the bar is its own finishing blow: the boss does not topple, the Dawnbreak
plays out, and the boss's death follows its last strike. Each finisher takes 2 to 2.7 seconds.

**Falling no longer costs your relic.** *Again, with (relic)* (or R) on the defeat screen, and Restart
run in the pause menu, start a new first trial straight away with the same hero and relic; boons, omens
and the Dawnbreak meter start over as before. The relic is given up only by going back to the camp,
where the reliquary offers new ones (the defeat screen's camp button says so).

## Three more from play (v1.7c)

**The Knight's Graves reach the top of the screen.** The four to six columns that come down where you
stand used to stop 200 pixels up, so a double jump cleared them. They now run from above the view to
the floor. The only way out of one is sideways. Measured: a hero who only jumps on the spot loses 2
health to it; one who keeps walking loses none.

**Every phase has its own arena.** There used to be one pair of platforms, and a boss either had it or
did not. Now each boss lays the arena out anew for each phase (`A.LAYOUTS` in `js/arena.js`); what
stood before sinks into the floor and the new platforms rise out of it. No two are alike.

| Boss | Phase I | Phase II | Phase III |
|---|---|---|---|
| Warden | bare floor | two wide wings, torn up by its hands (as before) | three steps: low, high in the middle, low |
| Magus | one dais in the middle of the hall | four small floes at two heights, on the frozen floor | two low stones, under the storm |
| Veil | bare floor | three narrow perches in the dark, the middle one higher | a ledge at each wall, under the wires |
| Knight | bare floor | what is left of a stair by the west wall: two steps | one stone inside the ring of blades |

The Magus still blinks to above whatever platforms are up, and the Veil's high lane runs at the height
of the platform you are on.

**Eos has a second way to play.** He was one idea (hold your ground, charge, draw) with a ranged
special bolted on that did what Vesper's lance does. His special is now **Still Point**, a parry:

- Press it and he sets the sheath across his body and stands still for 0.45 s.
- **A blow that lands in that time is turned.** It does no harm, a melee swing is stopped and its
  owner rocked, and all three marks on the sheath light at once.
- **The marks stay lit for 2.5 s with no button held**, and the next press of attack is the full
  draw (100) straight away. If you were already holding a stance, it is simply full.
- **If nothing lands, the Starlight is spent for nothing**, and he was standing still for it.

So there are two ways to reach a full draw: wait for an opening and hold for a second and a half, or
ask for the blow and take it on the sheath. A turned blow is not a perfect dodge, so the draw after
it is 100, not the 200 of a draw through a blow; that stays the harder and better play. The
**Second Light** boon now answers a turned blow with the old crescent of light (40).

Eos is "he" in the game's text now.

Measured: dodge tests unchanged (37 lose 0). Boss tests lose 6 in 166 runs, one more than before: the
scripted hero takes a hit from the Veil's Cuts in phase III, where the new ledges are. Random-input
fights, four heroes against four bosses through every phase, ran without errors.

## After a playtest (v1.7b)

Three things from a player who took every hero through a Standard run.

| They said | What I found | What changed |
|---|---|---|
| "Hammer guy prob needs tune up, charge is weak" | Aster's base kit was fine (the scripted hero clears fights a little faster with her than with Vesper), but holding the smash dealt **less** per second than not holding it: 1.05 s for +50% and a wave of 14. | The charge takes **0.9 s** and adds **80%** (40 becomes 72), the wave is **20**, and the shaken ground reaches a little further. Measured on a boss that cannot die: 56.1 damage a second never charging, 58.7 charging every smash. So charging is now slightly ahead, and still gives what it always did: she cannot be moved, and the blow reaches further. |
| "Bow right click prob gives too much meter ... spam right clicking ... things blew up in a few seconds" | Moon Volley was the only special that earned Starlight back. Point blank it returned 30 of its 100, and **86 of 100** with two Bright Veins and Full Quiver, for 128 damage a cast. | The volley's arrows **earn no Starlight** (they still build Flow and Dawnbreak like any special). Its damage is unchanged: 80 point blank, 128 with Full Quiver. It just cannot pay for the next one. |
| "Every boss having a free stagger check seemed off" | The Reckoning: the boss goes to the middle, a ring closes, and breaking its ward staggers it. Every boss did it twice a fight, and the ward always broke in 0.5 to 4.5 of the 6.5 seconds allowed. | **Only the Warden does it now** (its Eclipse), and its hands guard it while it does (see below). The Magus, the Veil and the Knight no longer do it; their staggers come only from their own bars. |

**The Warden's Eclipse is guarded.** Left as it was, it was still a non-mechanic: the eye came down, the
hands went to the sides, and you hit it. Now, while the eye gathers:

- **Its hands come down in turn on wherever you stand**, about once a second. Each is the ordinary
  slam: the fist follows you, stops, draws back and falls, and sends a wave along the floor both ways.
  So: step out from under it, jump the wave, get back to work.
- **A hand lies where it fell for half a second, and a blow to it is a blow to the ward.** The fist
  that just missed you is the easiest thing in the arena to hit, which matters most to heroes who
  cannot easily reach the eye.
- One gets up as the other comes down. With **one hand** left, a meteor falls on you while it gets
  up. With **none**, meteors fall on you throughout.
- The ward's strength and the 6.5 seconds are unchanged; the time now goes on dodging.

Measured with the ward forced (`boss.js`, `guarding`): a hero who stands and swings loses 2 to 3 health
before the ward breaks. A scripted hero who steps out from under each fist and jumps each wave breaks
it in 3.1 s as Aster, 4.2 s as Lune, 4.8 s as Vesper and 5.8 s as Eos (flicks only), having faced two
to four slams; three of the four took no damage, and the Vesper script, which is a crude dodger, took 1.

Scripted full fights after these changes (seconds, Warden / Magus / Veil / Knight): Vesper 69 / 79 / 79 /
63, Aster 56 / 71 / 70 / 53, Lune 82 / 117 / 98 / 83, Eos 68 / 81 / 74 / 60. Against the three duelling
bosses most fights are a little longer than before, because two free staggers are gone. Lune is the
slowest by a clear margin, as she was meant to be before the volley loop hid it; the Magus figure
swings a lot from run to run because it blinks out of the way of arrows.

## Every second of a fight (new in v1.7a)

A pass over the things that happen all the time, not the big moments. None of it adds brightness.

| When | What is new |
|---|---|
| You hit a boss | The Magus, the Veil and the Knight **rock back from the blow about their feet and are pressed down by it**, then spring upright, a little past it and back. The harder the blow, the further. The press is held for the whole of the hit-freeze, so the freeze shows a struck pose instead of a still one. (`K.recoil` in `bosskit.js`.) |
| You hit a boss | The hero is pressed into the blow for the same instant. |
| You keep hitting | **Each hit in a run sounds higher than the last**: three quarters of a tone a hit, up to six tones. It drops back after 1.25 s without a hit, or when you are struck. |
| You swing | **The body goes with the weapon**: it rocks back while the weapon is carried up, drives in behind the cut, and the front foot steps in under it. Aster leans back the whole time she holds a charge. Lune is kicked back a little by each shot. |
| Something just misses you | **A near miss**: a streak of your light off the side it passed, a thin sound, and a little Flow (2) and Dawnbreak. It needs no dash: walking or jumping clear by a hair does it. Once per attack, and not while you are passing through things anyway. No word for it. |
| You set off from a standstill | The back foot throws dust and the view is nudged the way you go. |
| You fall a long way | Thin streaks of the air you came through, above the hero. |
| You are at close quarters | **The view leans in**, by 2.5% at most, and a little more while the boss is staggered. It eases back out as you part. |

Also in this build, more of the v1.6d rule that nothing whites the picture out: a boss's **blast** is its
own colour with a hot rim (it was a solid white disc), and a **Clash** crosses in gold with a thin white
core (it was two white bars).

Measured: the scripted tests are unchanged (Warden 37 lose 0; others lose 5 in 166 runs). Random-input
fights, four heroes against four bosses through every phase, ran without errors and produced 26 near
misses between them. Not yet played by a person.

## Less light, more weight (v1.6d)

Big moments used to be made of brightness: a flash, a wide white cut, a glow over the boss, and bloom on
top of all three, which could white out the middle of the screen. Nothing is allowed to do that now.
The changes are in the shared effect code (`js/fx.js`, `js/post.js`), so they apply to every hero and boss.

| What | Before | Now |
|---|---|---|
| Full-screen flashes | as bright as asked for | two fifths of that, never more than a sixth of the way to solid |
| Glows (`F.light`) | added together until white | about half as strong, the wide ones less still, and screened on, so several on one spot settle at their own colour |
| Cut marks | a white bar with a coloured edge | a band of colour with a thin bright core |
| The impact frame | the picture inverted (a night scene turned white) | a dark frame: everything sinks to black except blades, eyes and the cut |
| Bloom | | about three fifths of what it was |
| A boss that is struck | a white dome over it | a tint over its body |
| The Warden's Sunburst | near white from wall to wall | the boss's colour over the arena, hot only round the core |

What replaces the light:

- **A pinch of darkness.** Whatever asks for a flash also darkens the edges of the view for a moment, so
  a big blow closes the frame in on itself.
- **A ripple in the air** (`F.ripple`). A ring runs out from heavy hits and impact frames and bends
  what is behind it, like heat. It adds no light.
- **What the blow does to the place.** Eos's counter now cracks the floor under the boss, throws up
  stone and sends dust out along the ground both ways.

The Screen flashes setting still scales or removes the flashes, the dark frame and the edge darkening.

## Eos's counter lands like one (v1.6c)

A three-mark draw through a blow was already her best play (a perfect dodge, then a cut of 200), but it
looked like any other heavy hit. Now it has two beats of its own:

- **The held breath.** The moment she passes through the blow, the arena goes dark and time runs at
  60% until the blade is home (about 0.8 s). The line of the cut hangs behind her in gold. This happens
  for a counter at any number of marks, and also if she dashes through a blow while a cut is still on
  its way. A counter that cut nothing lets go of the dark at once.
- **The landing** (three marks only). The cut crosses the whole arena, the picture slips along it as
  it does in Horizon (about half as far, for less time), the ground under the boss cracks, a bell
  rings, and light falls like petals along the length of the line.

Damage is unchanged. `hush` and `counterLand` in `js/player.js`.

## Fewer words (v1.6b)

Help text that was still shown inside a fight is gone: the **SHADOW** label on the safe ground during
the Warden's Sunburst (the dark and its pale frame say it), **DAWNBREAK READY** over the hero (the
sound, the gold ring and the bar under Starlight say it), and the row of controls that appeared over
the first two fights of a session (the camp lists them, and Tab opens the Moves page). What is still written in a fight is what
happened, not what to do: damage numbers, PERFECT, RIPOSTE, SUNDER, CLASH, the Flow rank, and a boss's
one-word state (STAGGERED, SPENT and the like).

## Eos, the Sheathed Dawn (new in v1.6a)

A fourth hero, built around one idea: **the blade stays in its sheath, and patience is what you spend.**

| Button | What it does |
|---|---|
| Attack, pressed | **A flick.** The blade is out, across and home again: 11. It comes out the moment you press. |
| Attack, held | **The stance.** She sets her feet and Focus gathers while she stands on the ground: one band on the sheath lights at 0.45 s, a second at 0.95 s, the third (gold) at 1.5 s. She walks at 45% speed while she holds it. |
| Attack, let go | **The draw.** She is carried 170, 230 or 300 pixels along the line you aim down (the mouse, or a held direction; straight up works) and cuts everything she passes through for 18, 46 or 100. The cut does not land yet: a thin line hangs in the air, she feeds the blade home, and the damage arrives on the click, 0.2 to 0.46 s later. |
| Special | **Still Point** (since v1.7c; it was the Dawn Arc, a ranged crescent too like Vesper's lance). He sets the sheath across his body and waits, for 0.45 s. A blow that lands in that time is turned: no harm, the swing is stopped, and all three marks light at once and stay lit for 2.5 s, so the next press is a full draw. If nothing lands, the Starlight is gone. |
| Dawnbreak | **Horizon.** Every light in the arena runs to the mouth of the sheath; she is then on the far side of the boss with a hair of light lying across the arena. When the blade is home the cut arrives for 250 (110 to anything else the boss has out), and the picture itself is cut in two along the line for half a second. |

What makes her worth learning:

- **A dash or a jump keeps the Focus you have. Being hit loses all of it.** Focus only gathers on the
  ground, so the fight becomes finding the half-seconds in a pattern where you can stand.
- **The draw passes through attacks,** for a little less time than a dash does. Drawn through a blow it
  is a perfect dodge, and the cut that follows is its Riposte: a three-mark draw through a swing lands
  for 200. That is the play the whole hero is built to reward.
- **Patience is paid for.** Held without a break, flicks alone are about 30 damage a second, one-mark
  draws 37, two-mark 41, three-mark 53. Vesper holding her button is about 46.
- A three-mark draw that lands on a staggered boss is a Sunder, like any finisher; one that lands while
  the boss's own swing is coming round stops the swing (a Clash).
- No text, no meter on the HUD: her Focus is the three bands on the sheath, three rising notes, and a
  sliver of blade showing at the mouth.

Her way back to rest is the move itself: every flick ends with the blade finding the sheath, and the
long sheathing after a draw is the wait before the cut lands.

Also in this build: the Hall of Echoes has a fourth alcove (the hall is the same width; its bays are
narrower), the hero screen has a fourth card, a new boon (**Second Light**, Eos only; in this build: the Dawn Arc is
followed by a second at 60%), and `tools/feel-check.js` can play her.

Measured with the scripted hero (never hit, never dodging, so no Ripostes): Eos clears the Warden in
74 s, the Magus in 74, the Veil in 85 and the Knight in 55; Vesper takes 75, 72, 87 and 75. Not yet
played by a person.

## A finished picture, and a way back to rest (new in v1.5a)

**The finishing pass** (`js/post.js`). Nothing about what is drawn changed; this is what is done to
the frame afterwards, the way a film is graded.

- **Bloom.** A small copy of the frame, multiplied by itself so only what is bright survives, is
  laid back over it as light at three sizes. Blades, eyes, spells and the eclipse now spill a little
  past their edges instead of ending in a hard line.
- **Tone.** The arena's own light from above and a cool dusk below, as a soft-light wash.
- **Grain.** A fine film grain that moves 24 times a second, so large flat fills stop looking flat.
- **Reflection.** The floor takes a faint, quickly fading reflection of whatever is bright just above it.
- **Depth.** Far scenery stands in haze up to its knees; shafts of the arena's light slant down behind
  the fight; a little fog drifts in front of it as well as behind.
- **The floor** is dressed stone: a lit lip, blocks of uneven width, a grain to the face.

All of it (the floor's stonework aside) goes off with **Settings > Glow, grain and reflections**, for
slow machines or taste. It costs three small copies of the frame and four full-screen draws.

**Every move has its own way back to rest.**

| Who | After | The way back |
|---|---|---|
| Vesper | the first cut | a small flick outward, then the blade swings back to her side |
| | the rising cut | it carries on up a little, then comes down behind her |
| | the finisher | she flicks the light off the blade, holds, and lowers it |
| | a thrust | the arm stays out a moment, then the point drops and comes back |
| Aster | the sweep | the maul goes over the top and lands on her shoulder (she takes the weight) |
| | the smash | she wrenches it out of the ground first |
| Lune | a shot | the bow drops with the string still humming |
| | the heavy arrow | the bow goes once round on its way down |
| Knight | any cut | the blade is stood up in front of it and let fall back onto the shoulder |
| | sword in the ground | it leans back and wrenches it free |
| | a crash or a whirl | it pushes itself up off one knee |
| Veil | a cut or a lunge | it flicks both blades clean |
| | a throw | the arm comes home across its waist |
| | an ambush | it tears the blade from the floor and springs back off it |
| Magus | ice / fire / lightning | splinters drop from the staff / it goes out in smoke / it crawls down the wood; then the Magus sinks and floats back |
| Warden | a hand attack | the hand shakes itself out and makes a fist once on its way home |
| | the core alone | the eye closes for a moment |

For the heroes it is drawing only: any button cuts it short, so nothing is slower to respond. For the
duelling bosses the time it takes is taken out of the wait before their next attack, so the pace of a
fight is unchanged (`B.recover`, `B.recT` in `bosskit.js`).

## Swings with weight (new in v1.4b)

A sword or maul swing now shows where it comes from. The chain was always down, up, down, but the
first cut reached the front in a single frame, so the eye saw the blade come up from its low carry and
read it as a rising cut. Now each swing has a wind-up you can see (`swingAngle` in `player.js`): the
blade is lifted overhead, falls, and hangs at the bottom of its arc; the second cut rides that weight
back up from where the first ended; the finisher is drawn further back from the top and comes down.

Vesper's attacks are a little slower to match: wind-up 0.06 s and 0.05 s (was 0.02), a swing every
0.27 s and 0.29 s (was 0.22 and 0.24), the finisher every 0.5 s (was 0.46). A full chain takes 1.06 s
(was 0.92). The cuts do 10, 12 and 26 (were 9, 11, 24), which leaves her about 5% below her old damage
over time. Aster's maul uses the same wind-up shape with her timings unchanged.

**The Knight carries its greatsword on its shoulder**, one-handed, standing and walking. It used to
drag the point along the ground, so every wind-up was the blade being hauled up from the floor. Now a
cut starts high and falls with the sword's weight, and the cut after it is the blade coming back up
off the ground. Its Rend always opens with the falling cut (the high crescent) and then the rising one
(the low wave); the order used to be random.

**Its greatsword is longer** (152 from guard to point, was 124, about as long as the Knight is tall),
its reach follows the blade (195, was 185), and its poses were redrawn so the point comes to rest on
the ground instead of under it.

**Weight.** The Knight's body is no longer blended from pose to pose; every part of the pose is a
weight on a spring (`B.tick` in `knight.js`). It starts slowly, gathers speed, runs a little past where
it is going and settles; whatever is on its way down is hurried and whatever is on its way up is held
back. A falling cut lands hard and bites; hauling the sword back onto the shoulder takes effort. The
heroes' cuts follow the same rule inside their active window: a falling blade speeds up and is caught,
a rising one leaves fast and slows as it climbs.

## Shounen (new in v1.4a)

Asked for after a playtest: Lune too safe, phase changes all alike, red marks under melee hits, too much
text, and "more anime".

**Nothing explains itself in words during a fight.** The mechanic hints are gone, and call-outs are one
word with no instruction under them. The setting that used to be "Mechanic hints" now only covers the
controls reminder and the camp's welcome.

**Melee hits are not marked on the floor.** A boss's swing, lunge, charge or whirl no longer draws a red
slice, lane or box. The warning is the wind-up, and a **glint** on the blade (with a small ring of sound)
a fifth of a second before it comes out; a blow that will take two health glints red. Things thrown, and
blows from a boss that cannot be seen at the time, keep their marks. The Warden's fists keep theirs.

**Clashes.** A heavy blow of the hero's (a finisher, a thrust out of a dash, anything from Aster's maul)
that meets a boss's swing as it comes out turns the swing aside: both are thrown back a step, the
boss's stagger bar fills a little, and the frame inverts for an instant. Two-health blows (red) cannot be met.

**Impact frames** (`G.fx.impact`): the picture inverts for a few frames with lines running in to the
blow. Used for staggers, phase breaks, deaths, clashes, Dawnbreak finishers, fully charged smashes and
any hit that takes two health; never twice within half a second, and not inverted if Screen flashes are off.

**Dawnbreak opens with a cut-in**: a slanted band across the screen with the hero's eyes and the name.

**Moonfall (Lune) is rebuilt.** She springs up and a full moon rises behind her; she draws, and the
moon wanes to a blade as its light runs into the arrow; the arrow goes through the boss (26), the moon
answers with fourteen beams (11 each), she lands with her back turned, and then the cut arrives (70).
250 in all, as before.

**Keeping away is answered.** Each duelling boss counts how long the hero stays far off (or up in the
air and out of reach); after about 2.6 s its next attack is its answer (`B.answer`, `B.kite` in `bosskit.js`):

| Boss | Answer |
|---|---|
| Knight | **Sever**: cuts thrown off the blade straight at the hero, at any height, then it runs them down |
| Veil | **Hunt**: it vanishes and is beside the hero, in the air if that is where they are, already cutting; then three knives |
| Magus | its aimed **Shards**, when the hero will not come down out of the air |
| Warden | **Flick** (or a lance; the shard storm in phase III) at a hero who lives in the air |

Lune's downward shot also lifts her less each time before she next lands (100%, 70%, 40%, 10%, nothing).

**Every phase change is the boss's own**, and none of them is "new colours and two platforms":

| Boss | Phase II | Phase III |
|---|---|---|
| Warden | **Totality**: it drives both hands into the floor and tears the two platforms up out of it | **Black Sun**: it crushes its own hands into shards (as before) |
| Knight | **The Host**: it dies; then the bell tolls, its cape burns away, and from here every cut it makes is made again half a second later by its own ghost | **Blood Oath**: greatswords fall wall by wall until the ground is a duelling ring 680 wide. No platforms in this fight any more |
| Veil | **Shadows**: it puts the lights out. You see by your own light; the Veil is a pair of eyes. A stagger brings the light back | **Execution**: the dark is torn away and two wires are strung across the air, low over the middle and higher at the walls. One jump clears the floor; a second meets the wire. A dash passes through |
| Magus | **Confluence**: the floor freezes and stays frozen (about a fifth of the grip); the platforms are dry | **Trinity**: a storm closes over the arena. Half a second up in it and you are struck. The floor is still ice and the Magus burns |

**Every stagger is the boss's own** (`staggerIn`, `staggerOut`, `staggerMult`, `staggerDur`):

| Boss | Stagger |
|---|---|
| Warden | the core drops to the floor (as before), x1.4 |
| Knight | **Disarmed**: its sword is struck away and stands in the floor. x1.4. When it gets up it calls the sword home through anyone in the way |
| Veil | **Caught**: thrown across the floor into the wall. 70% as long, x1.9 |
| Magus | **Silenced**: it falls out of the air. 115% as long, only x1.2, but every hit knocks Starlight out of it |

**Aster.** The first swing no longer hits behind her: it is a wide sweep on the side she swings to.
A full charge now adds half again to the smash (60, was 80), takes 1.05 s (was 0.9), and its wave does
14 (was 24) with a narrower quake.

Checked with the scripted players: Warden 37 tests lose 0; the other three lose a handful in 166 runs
(the Knight's whirl now that it has no platforms, one lightning strike, one storm strike). Each new
scene was looked at as still frames. **None of this has been played by a person**: how the dark, the
ice, the wires and the ring feel, and whether the glint is warning enough at speed, is unknown.

## Specials you can see thrown (new in v1.3c)

**Vesper throws the Star Lance.** She rocks back, her near arm draws a lance of light back over her
shoulder (the sword passes to her other hand for a moment), and then the arm whips through along the
aim and the lance leaves her hand. The wind-up is 0.09 s (`LANCE_WIND` in `G.PLAYER`); it used to
fire on the press. A dash during the wind-up throws it at once, so a dodge never eats it; a hit during
the wind-up cancels it and gives the Starlight back. The lance in flight now has a spearhead.

**The other specials and two plain states have a pose.** Lune pushes the bow out along her aim and
snaps the string hand back past her ear, with the string still shaking. Aster holds the maul overhead
through the Starfall plunge and brings it down into the floor when it lands (on the ground the slam
is immediate). Mending, the hands come together at the chest and the weapon is lowered. Knocked back
by a hit, the hero leans away with the arms flung out.

The poses are drawing only except for the lance's wind-up. Tests: Warden 37 tests lose 0, the other
bosses 0 in 158 runs, as Vesper on seed 1.

## Help, and smoother, sharper drawing (new in v1.3b)

**Help.** The title screen and the pause menu have a Help page in place of How to play. On the left
are seven subjects; moving onto one shows it on the right at once. The first, How a fight works, is
eight numbered steps from the first warning to the next trial. The others are lists of the game's
own words with what each means: Attacking (chain, finisher, thrust, stagger, Sunder, Riposte, Clash),
Your meters (health, Starlight, mend, Flow, Dawnbreak, flourish), Staying alive (warning, dash,
perfect dodge, tell, Last Light), Bosses (phase, Reckoning, ward, omen), A run (trial, relic, boon,
grade, Sunshards, trophy, feat) and The Vigil (every place in the camp). Controls, the old How to
play page, is the last entry. The text is the `HELP` list in `js/ui.js`.

**The hero moves between poses instead of jumping between them.** Feet, lean and the weapon at rest
used to change in a single frame when the hero went from standing to running, left the ground,
landed, or finished a swing. They now ease across over a few frames (the sword takes about an eighth
of a second to come back to rest after a cut), and turning round narrows the figure for an instant
like a card flipping. A swing, a shot and the flourish are still drawn exactly as timed, so attacks
are as sharp as before. Only the drawing changed: hitboxes and timings are the same, and the tests
give the same results. The bosses already eased between their poses.

**Backdrops are painted at the size they are shown.** The arena backdrops and the camp's four
scrolling layers are painted once and kept. They were kept at 1280 by 720 and stretched to fit the
window, which made them soft on a large window or a high-density screen while the characters drawn
over them stayed sharp. They are now painted at up to one and a half times that (in quarter steps,
to keep memory in hand) and painted again when the window changes size.

The frame pacing was checked and left alone: the game already advances in equal steps that land on
each frame, and already draws the canvas at the screen's own pixel density.

## Fun things (new in v1.3a)

Three additions that are there to be played with.

**The flourish.** Press T (or G) on the ground and your hero twirls the weapon and holds it high for
0.7 seconds. You can do nothing else until it ends, and a blow that lands ends it. Finish one and
Flow rises by 10 and Dawnbreak by 3%. Finish one while the boss is in the middle of an attack and it
is **BRAZEN**: Flow +30, Dawnbreak +10%. It can be used again after 5 seconds (2 if you were caught).
In the camp it is only for show.

**Toys in the Vigil.**

- **The old bell**, at the far left end past the Hall of Echoes. Strike it and it rings. Keep it
  ringing (another blow within 1.6 seconds) and each note climbs a scale. Five in a row is a full peal.
- **The lantern**, in the yard beside the sparring post. Knock it into the air and keep it there: it
  counts the blows you land before it touches the ground and remembers your best. It is light and
  drifts away from you, so you have to chase it. Struck from above it is driven down. Left lying far
  from its place, it finds its own way back. Arrows, specials and Dawnbreaks all move it.

**Feats and the Tally.** Eighteen things worth doing once. Each pays Sunshards the first time, and a
standing stone between the Hall and the Shrine keeps count: one mark for each, lit when it is done.
Use it to read the list. Feats done in a fight are named on the victory screen. Practice and test
modes do not count.

| Feat | For | Pays |
|---|---|---|
| Untouched | each boss: win without losing any health | 30 |
| Swift | each boss: win in under 2:30 | 20 |
| Brazen | each boss: win after three brazen flourishes | 20 |
| An eye for an eye | the Warden: land three Ripostes | 20 |
| Return to sender | the Magus: send two Comets back into it | 20 |
| Faster than silence | the Veil: reach Flow rank S | 20 |
| Disarmed | the Knight: strike it eight times while its sword is away | 20 |
| Bellringer | the camp: ring the old bell five times without letting it fall quiet | 10 |
| Lamplighter | the camp: keep the lantern off the ground for ten blows | 10 |

That is 380 Sunshards in all, a little over a quarter of what the whole Shrine costs. The feats are
in `js/feats.js`; the toys are in `js/hub.js`, as extra targets of the sparring post.

## Tells (new in v1.2a)

Each boss now has attacks that come in two or three forms, and a small thing in how it moves that says
which form is coming. Nothing on screen spells it out; the warning marks are the same as ever and still
show where it will hurt. The tell is for a player who has met the boss before and wants to know sooner.
Each boss tells in a different way.

| Boss | Watch | What it means |
|---|---|---|
| The Veil | **how fast it cuts** in a flurry | Three unhurried cuts: it springs back and throws a fan of five knives, so jump or dash through. Five quick, short cuts: it springs back and lobs one knife that bursts where it lands for **2 health**, so get well clear of the mark. The quick cuts are shorter in reach and the Veil does not turn during them, so behind it is safe |
| The Knight | **its foot and its blade** | A stamp after a cut: another cut is coming. The sword dragged along the ground: it is finished, go in. A blade that turns red and sheds embers: that cut does **2 health** and throws a wave along the floor, so be out of reach and ready to jump |
| The Magus | **how it holds its staff** | Invocation: raised with a thread of light going up, the bolt comes from above; levelled like a spear, a beam along the floor, so jump; planted with a ring at its foot, the ground under you and then two waves. Fireball: one mote burning in the staff is the ordinary one; all three motes flying into the staff is the great fireball, slower, with a much wider burst for **2 health** and fire left on the floor |
| The Warden | **its eye and its fist** | The eye shuts once, with a ring of light, for each lance it is about to throw (one, two or three). A fist that glows red and trembles before a slam comes down harder: **2 health** under it and a second pair of waves just behind the first |

How often each form comes rises with the phase (for example the burning blade: one cut in four in
phase I, almost half in phase III). The boss's tips between attempts mention its tells.

For testing: `G.debug.variant = 'plain'` turns every tell's second form off; a list such as
`'fast,blaze'` forces forms on. The names are `fast` (Veil), `follow` and `blaze` (Knight), `great`,
`high`, `level` and `plant` (Magus), `heavy`, `n1` and `n2` (Warden). In code a boss asks
`G.kit.chance(p, tag)`.

## What changed in v1.1a

- **Aster is her own character now.** The maul no longer shares the sword's three-hit chain. Her
  chain is two blows: a sweep that goes right round and hits whatever is on either side of her, then
  a smash. Keep the button held on the smash and she holds it back and charges it over 0.9 seconds,
  up to half again the damage and a wider quake; fully charged it also sends a small wave along the floor. While
  she charges she moves at a third of her speed, but a blow that lands on her does not knock her
  back or lose the charge (it still costs health). She is slower to start and stop than the others,
  always lands hard, and her footsteps raise dust.
- **A Moves page for each hero.** Hold Tab in a fight or in the camp (the fight waits), or choose
  Moves in the pause menu. It lists every button with what it does for the hero you are playing,
  using your own key bindings.
- **Each boss has one attack of a new kind**, so the answers are no longer all "leave the marked
  ground, jump the wave":

| Boss | Attack | What is new about it | The simple answer |
|---|---|---|---|
| The Warden (phases I and II) | Sunburst | you go to a place instead of leaving one: it burns the whole arena, and only the ground behind its planted hands is in shadow | get behind a hand before the light fills; then hit the hand while it is stuck |
| The Magus (all phases) | Comet | you send it back: a slow star follows you until you strike it, and then it flies home for 70 damage and most of a stagger | strike it. In phase III the Magus bats it back once, faster: strike it again |
| The Veil (all phases) | Echo | your own path is the danger: a shadow runs exactly where you ran, about a second behind, for 4 to 6 seconds | keep moving; when you have to turn back, jump the shadow or dash through it |
| The Knight (all phases) | Hurl | the weapon leaves the boss: its sword crosses the arena and sticks in the far wall. Until it calls the sword home it cannot swing and takes 30% more; the sword then flies back, at your back if you are between them | jump the sword both ways; hit the Knight while it is unarmed |

## The heroes

All four share movement, the dash, Starlight and mending. Weapon and special differ. Eos works differently enough to have her own section above; the table covers the other three.

| | Vesper, the Starblade | Aster, the Starmaul | Lune, the Moonbow |
|---|---|---|---|
| Health (Standard) | 5 | 6 | 3 |
| Weapon | sword: 10 down, 12 back up, then a 26 finisher | maul: a wide sweep in front (18), then a smash that shakes the ground (36). Hold the smash to charge it, up to 65; fully charged it also throws a wave along the floor (18) | bow: arrows of 5, 6, then a piercing 13, in any direction; up to 60% stronger within 120px, up to 30% weaker past 240px |
| Special | Star Lance: a piercing shot at any range | Starfall: a blast around her; from the air she plunges first and passes through attacks | Moon Volley: a fan of five arrows and a leap backwards |
| Extra | a slash out of a dash is a thrust | fills the stagger bar 35% faster; a little slower on foot | triple jump; firing downward in the air lifts her; moves at 60% speed while firing; arrows give less Starlight than melee hits |

- **Combo:** every third attack in a chain is the finisher. It winds up for a beat and is worth more than the
  first two together; the weapon glows gold when it is next. Hold the button to keep the chain going.
  The chain resets after 0.6 s without an attack, but a dash does not use up that time.
- **With the sword or maul:** a hit landed in the air holds you up, a slash straight out of a dash is a thrust
  (40% more damage, longer reach), and a downward strike in the air bounces off whatever it hits.
- **Dash:** 0.24 s of invulnerability. If an attack would have hit during it, that is a perfect dodge:
  time slows, Starlight fills, and the dash is ready again at once.
- **Starlight:** three segments, filled by landing hits, perfect dodges and cutting orbs out of the air.
  A segment buys the hero's special or one mended health.

Heroes are defined in `G.HEROES` in `js/run.js` (numbers, colours, text); the weapon and special code is in `js/player.js`.

## The run

- A run starts in the camp: choose a **hero** at the Hall of Echoes, take **one of three relics** at the reliquary
  (drawn from nine, up to thirteen once trophies are won), and step through the gate. The relic lasts the whole run,
  and since v1.7d it stays with you when you fall and go again; only going back to the camp gives it up.
- A run is **six trials**, each against a different boss. The first is drawn at random; after that you
  choose each one at its portal at the crossroads (since v1.9a). A seventh, final fight is planned (its
  portal stands dormant); until it exists, winning trial VI wins the run.
- Beating a boss offers **three boons; you keep one**, chosen on the road between trials (since v1.8b)
  before you go on to the next. Once you hold both halves of a **pair**, a gold pair boon can take one
  card's place.
- A beaten boss's portal can turn **corrupted** (v1.9a): an optional, far harder fight for a second
  relic and triple Sunshards.
- Each trial after the first gives the boss 15% more health, 4% shorter warnings and 6% less rest.
  From trial V the bosses also use their Merciless patterns (with six bosses, the last two you meet).
- Health is restored between trials. Falling ends the run; the gate in the camp shows the runs won, or
  the deepest trial reached.
- From trial II each trial carries an **omen** (two from trial VI), shown at the top right of the fight.
- Every fight pays **Sunshards**, which buy permanent upgrades at the **Shrine** in the camp.

## Flow and Dawnbreak (new in v0.7a)

- **Flow** is a rank shown under the timer: C, B, A, S, SS. It climbs with every hit, cut-down orb and
  perfect dodge, runs down after 2.2 seconds without one, and loses two thirds when you are hit. Each
  rank adds 3% damage and 2 Sunshards at the end of the fight (counted from the highest rank reached),
  and from rank A light lifts off the hero.
- **Dawnbreak** is each hero's ultimate. Its bar (under Starlight) fills from damage dealt and a little
  from perfect dodges, and carries over between trials. When it is full, one press spends it. While it
  plays you cannot be hurt, and the boss and everything it has thrown run at a twentieth of their speed.
  It cannot be started while the boss cannot be hit.

| Hero | Dawnbreak | What it does |
|---|---|---|
| Vesper | Thousand Stars | she vanishes; eight cuts of 20 from every side, then a cross-cut of 80 |
| Aster | Worldbreaker | she rises and comes down for 250, 110 to anything else the boss has out, and everything that can be cut out of the air is destroyed |
| Lune | Moonfall | a moon rises behind her; one great arrow (26), fourteen moonbeams (11 each), then a cut of 70 |
| Eos | Horizon | one cut from one side of the arena to the other, 250, landing when the blade is home; 110 to anything else the boss has out |

The last blow of each fills the stagger bar like a Star Lance. When a boss falls, a finishing cut crosses the screen.
Numbers are in `js/flow.js`.

## Moments (new in v0.8a)

Set pieces and rewards that punctuate a fight. All of them are in `js/moments.js`.

| Moment | When | What happens |
|---|---|---|
| **Reckoning** (the Warden only, since v1.7b) | once in phase I (below five sixths of the boss's health) and once in phase II (below half) | The boss goes to the middle of the arena, wraps itself in a ward and gathers a blast while a red ring closes on it for 6.5 seconds. Hits go to the ward, shown as a gold arc. Break it and the boss is thrown down staggered, Dawnbreak gains a quarter of its bar and the fight pays 6 more Sunshards. Let the ring close and two blast rings go out: dash through each. |
| **Riposte** | the first weapon hit within 1.5 seconds of a perfect dodge | double damage, with a freeze and a gold cut |
| **Sunder** | the first finisher on a staggered boss | 2.2 times damage, a longer freeze and a cracked floor. One per stagger. |
| **Clash** | a finisher, a dash thrust or a heavy arrow lands on the Veil or the Knight in the 0.3 seconds before its weapon swing lands, with you inside the swing | the swing is stopped dead; you are pushed back unharmed with 20 Starlight |
| **Last Light** | the first time in a fight a hit leaves you on 1 health | time slows, you cannot be hurt for 2.4 seconds, Dawnbreak gains 35% and Starlight half a segment |
| **One last push** | the boss drops below a tenth of its health | a call-out; the boss bleeds light and the screen pulses until it falls |

The ward's strength is sized to the hero: about 3.3 seconds of steady attacking (158 for Vesper, 165 for
Aster, 86 for Lune on Standard), more in later trials. A Dawnbreak breaks it outright. The Warden calls
its Reckoning Eclipse. (Until v1.7b the Magus, the Veil and the Knight each had one too: Convergence,
Death Mark, Dirge. The code is still in `bosskit.js` behind `B.reckons`.) A Reckoning is skipped if the boss leaves
the phase before it gets the chance, and forced attacks in the tests never trigger one.

## Omens (new in v0.7a)

| Omen | What changes |
|---|---|
| Stormfront | lightning strikes the column you stand in, every 5.6 seconds |
| Emberfall | a burning stone falls somewhere near you, every 3.4 seconds |
| Hunted | a slow wisp follows you; cut it down or let it hit you and it returns 7 seconds later |
| Frenzy | the boss rests a quarter less between attacks |
| Bulwark | the boss has a fifth more health and its staggers are 0.8 seconds shorter |

An omen is never repeated in the next trial, and each one adds 25% to that trial's Sunshards. Lightning
and stones are only called down in the rests between the boss's attacks, with their own 1.1 second
warning, so they land while the next attack is still being shown. Defined in `js/omens.js`.

## Sunshards, the Shrine and trophies (new in v0.7a)

- **Earning:** a victory pays 12 Sunshards, plus 5 for each trial before it, times 1.1 to 1.5 for the
  grade, plus the Flow bonus; then 0.75 on Gentle or 1.4 on Merciless, plus the omen and Prospector bonuses. The first
  victory over each boss pays 25 more. A defeat pays a share for the health taken off the boss.
- **The Shrine** (in the camp) sells permanent upgrades:

| Upgrade | Ranks | Cost per rank | Each rank gives |
|---|---|---|---|
| Vigor | 2 | 60, 160 | +1 health |
| Whetstone | 5 | 20, 35, 55, 80, 110 | +4% damage |
| Kindling | 2 | 25, 60 | each trial starts with 40% of a Starlight segment |
| Momentum | 3 | 30, 55, 90 | Dawnbreak charges 12% faster |
| Fourth Relic | 1 | 90 | four relics to choose from |
| Fourth Boon | 1 | 120 | four boons to choose from |
| Second Thoughts | 2 | 50, 110 | one redraw of the boons on offer per run |
| Prospector | 3 | 30, 60, 100 | +10% Sunshards |

- **Trophies:** the first victory over each boss adds its relic to the pool for every later run.

| Boss | Trophy relic | Effect |
|---|---|---|
| The Warden | Eclipse Eye | hits on a staggered boss deal 30% more |
| The Magus | Magus's Prism | your special deals 40% more |
| The Veil | Silent Shroud | after a perfect dodge, everything you do deals 50% more for 3 seconds |
| The Knight | Unburied Oath | on your last point of health, everything you do deals 50% more |

All of this is kept in the browser's storage under `solfall.meta`, so it belongs to one browser on one
machine; clearing site data resets it. Defined in `js/meta.js`.

| Relic | Effect |
|---|---|
| Ember Chalice | mending restores 2 health instead of 1 |
| Comet Shard | finishers deal 50% more damage |
| Twin Moons | one more Starlight segment; every trial starts with Starlight full |
| Thorn Crown | all damage +40%, 2 less health |
| Wardstone | the first hit taken in each of the boss's phases is blocked |
| Feather Cloak | one more air jump; move 12% faster |
| Stormcaller | every fifth hit calls lightning for 30 damage |
| Phoenix Feather | once per run, a killing blow leaves you on 3 health |
| Sunstone | the stagger bar fills 40% faster; staggers last 1.5 s longer |

| Boon | Kind | Effect | Times |
|---|---|---|---|
| Third Wind | Movement | one more jump in the air | 2 |
| Twin Dash | Movement | a second dash before landing; dashes recover 30% faster | 1 |
| Comet Step | Movement | dashing through the Warden deals 24 damage | 2 |
| Long Reach | Weapon | weapon reach +30% | 2 |
| Keen Edge | Weapon | weapon damage +25% | 3 |
| Quick Hands | Weapon | attack 18% faster | 2 |
| Crescent | Weapon | each finisher also throws a wave of light | 1 |
| Bright Vein | Starlight | Starlight fills 40% faster | 2 |
| Fourth Star | Starlight | one more Starlight segment | 2 |
| Split Lance | Starlight | Vesper only: the lance fires three at once, each at 60% | 1 |
| Aftershock | Starlight | Aster only: Starfall strikes a second time at half strength | 1 |
| Full Quiver | Starlight | Lune only: Moon Volley fires eight arrows | 1 |
| Second Light | Starlight | Eos only: a blow turned by Still Point is answered with a crescent of light across the arena, for 40 | 1 |
| Swift Mend | Starlight | mending takes half as long | 1 |
| Mirror Step | Starlight | Vesper and Lune: a perfect dodge fires a free shot at the core | 1 |
| Steady Heart | Survival | one more health | 3 |
| Second Dawn | Survival | once per trial, a killing blow leaves you on 1 health | 1 |
| Glass Star | Risk | all damage +35%, one less health | 1 |

The six gold **pairs** (v1.8a) are listed in "A run with a shape, and boons that pair" above.

Relics and boons are defined in `G.RELICS` and `G.BOONS` in `js/run.js`; their effects are applied in `js/player.js` and `js/boss.js` (search for `G.relic(` and `G.boon(`).

## The bosses

Every warning, for every boss, is drawn in the same red-orange. It fills up, flashes, then fires.
A marked patch of floor means step off it; a lane with arrows means something will cross at that height;
a line means a cut or a beam along it; a slice of a circle means a weapon will swing through it.

All four have three phases (at two thirds and one third health) and a stagger bar: hits fill it, and
when it is full the boss is helpless for a few seconds and takes 40% more damage.

### The Eclipsed Warden

| Phase | Attack | The simple answer |
|---|---|---|
| I Dusk | Slam: a fist tracks you, then drops and sends out two ground waves | step out on the flash, jump the wave, hit the stuck fist |
| | Sweep: a hand crosses the floor | jump (double jump is safest) or dash through it |
| | Clap: both hands close on a marked column (2 damage) | leave the column on the flash, hit both stuck hands |
| | Sun lance: a beam that tracks, locks, then fires | move once the line locks |
| | Ember rain: marked meteors | step off the markers |
| | Flick: a hand points and fires orbs at where you stand | step aside, jump them, or cut them down |
| | Crossfire: one hand fires along the floor, then the other at jumping height | jump the first beam, be back on the ground for the second |
| II Totality | Double slam, sweep there and back, triple lance, harder rain | as above, faster |
| | Corona pulse: expanding rings | dash through each ring |
| | Comb: alternating columns of light from above | shift one lane each volley |
| | Rocket punch: a fist fired across at your height | jump over it, hit it while it is stuck in the wall |
| | Burning floor: the floor ignites while a lance fires | get onto a platform |
| | Fan: the core throws fans of orbs, each offset from the last | stand in a gap, or cut an orb down |
| | Cage: both hands plant either side of you and embers fall inside | dodge inside, hit the planted hands; breaking one ends it |
| | Duet: a hand and the core attack together (slam with a lance, or sweep with embers) | answer both at once |
| | Swat: a fist knocks down the platform you are resting on | get off when it is marked; it comes back in about 6 s |
| | Flick and Crossfire return | as above |
| III Black Sun | Dive: the core drops on you (2 damage), waves and debris | dash out, jump the wave, stay close and punish |
| | Shard storm: aimed lines, then one flat line | keep moving, jump the last one |
| | Eclipse wheel: two beams turn through the arena | dash through each as it reaches you |
| | Collapse: a pull towards the core, then a blast (2 damage) | run clear of the circle |
| | Halo: the shards become a turning ring of blades around a low, slow core | slip inside the ring, where the core can be hit |
| | Fan returns, faster | as above |
| | Last Light: once, below 12% health: two rings, a half-turn of the wheel, then a collapse | each part as above; the core is spent afterwards |

**Stagger:** hits fill the stagger bar under the boss's health (hands fill it fastest). When it fills, the
core drops to the floor for a few seconds and takes extra damage. The core always takes 1.5x damage.

**Breaking a hand:** each hand has its own health (7% of the boss's), shown as an arc round its sigil.
Damage to a hand still hurts the boss. When a hand runs out it lies broken for 12 seconds: the attacks
that need it are skipped, the boss takes 25% more damage from everything, and if it broke in the middle
of its own attack that attack is cut short. Hands are made whole at each new phase.

**Resting on a platform** for more than a couple of seconds in phase II brings the Swat.

### The Threefold Magus

A floating caster that blinks away from you before most spells and stands still while casting, which is
when to reach it. Its platforms are up from the start. Ice is blue, fire orange, lightning violet.

| Phase | Spell | The simple answer |
|---|---|---|
| I | Shards (ice): shards over its head aim and fire one after another | keep moving; from far away, jump the shallow ones |
| | Rime (ice): spikes run along the floor away from it | jump as the ripple reaches you |
| | Fireball: a slow ball that leans after you and bursts where it lands | get away from where it comes down |
| | Bolts (lightning): strike after strike on marked columns, the last as three | step out of each column |
| | Spheres (lightning): bouncing balls that last six seconds | cut them down, or keep clear |
| II Confluence | Wall of flame: a low wall crosses the floor | stand on a platform, or dash through it |
| | Crystals: two crystals that burst into rings when their timers empty | break them first (they give Starlight and fill the stagger bar) |
| | Storm cloud: a cloud trails you and strikes below itself four times, while other spells go on | keep out from under it |
| | Fireballs now leave burning ground | stay off it for three seconds |
| III Trinity | Every spell ends with one more from another element: a single strike or shard | watch for it as the spell finishes |
| | Blizzard: wind pushes you towards a wall while icicles fall | push against the wind, step off the markers |
| | Cataclysm, once, below 12% health: rime from the centre, a great blast in the middle, three volleys of lightning | jump, run to an edge, change lanes; afterwards it lies spent |

### The Silent Veil

A hooded assassin that vanishes and reappears. It is fast and fragile, and every attack leaves it open
for a moment afterwards.

| Phase | Attack | The simple answer |
|---|---|---|
| I | Lunge: it crouches, its blade glints, it crosses the floor | jump it, or dash through for a perfect dodge |
| | Flurry: it runs in and cuts three times, stepping forward | back out of reach, or dash past it |
| | Knives: it springs back and throws a fan along dashed lines | jump the fan, dash through, or cut a knife down |
| | Ambush: it vanishes, a column follows you, it drops | step out; its blade sticks in the floor and it takes 30% more damage |
| | Backstab: it vanishes and reappears behind you | dash away as the cut is marked |
| II Shadows | Pincer: a lunge, and a shadow lunging the other way | jump both |
| | Mirror: three figures lunge one after another, the last along the platforms | jump, jump, stay down. A shadow dies to one hit |
| | Knife rain: it hangs overhead and throws fans downward | stand between the lines |
| | Cross: two diagonal cuts through where you stand | step aside |
| III Execution | Cuts: seven lines, each through where you are when it is drawn | step off each; jump the flat ones. Then it kneels, spent |
| | Mark: a circle closes on you and everything inside is cut | dash as it shuts |

### The Cinder Wolf (v1.8b)

A huge, lean wolf on all fours with a mane of living fire: a pure read-and-dodge fight, every attack told
by its body. 3,500 health. It enters out of the dark: two eyes open, it drops with a shockwave and fire
runs to both walls.

| Phase | What it does | The tells |
|---|---|---|
| I · Cinder (bare floor) | Pounce, bite, tail sweep, howl, rake; fire breath along the floor if you keep away | Haunches low and tail up: the long, high pounce (short spring otherwise). Head low: a lunge along the floor; reared: a snap at the air. A tail that curls first: two sweeps. Muzzle straight up: embers fall on you from the top of the screen; tilted forward: a line of embers marching away. Rearing higher before the rake: fire waves both ways |
| II · Wildfire (three burnt trees) | Its howl sets the arena alight. Wherever it lands or slams, the floor catches and burns for about 4 s. New: the wall-run | High on the wall: the arena darkens and it dives on you. Low on the wall: it flies flat across, just over a standing hero |
| III · Emberbed (two ledges and three stone islands) | It rises burning blue-white. Every 6 s the floor brightens, roars and flares: only the stones, the ledges and the air are safe. New: Frenzy (three pounces) and, once below 12%, Emberfall (it leaps out of sight and comes down like a comet; the ring of fire it throws out is passed by a dash) | The haunches before Frenzy's third pounce tell long from short |

Stagger (*FLOORED*): it rolls onto its back, its fire collapses into smoke and a burning heart shows on its
belly; 1.6x damage. Measured: boss tests lose 1 over 44 runs (a tail sweep the scripted dodger never
jumps); Vesper wins in 57-68 s, Aster in 44-50 s.

### The Drowned Leviathan (v1.8b)

A sea serpent lying out at sea behind the arena; only its head and neck come over the shore, and the head
is the only target. 2,900 health (it is often out of reach). It enters when the sea goes still, a shadow
with lights passes under the water, and it breaches.

| Phase | What it does | The tells |
|---|---|---|
| I (bare shore) | Lunge the length of the shore, snapping bites, the tail coming down from above the screen, spouts bursting from the floor to the top of the screen; a bubble volley or a lobbed brine bomb if you keep away | Rearing low with the snout down: a low lunge (jump it); tall with the snout up: a high one (stay down). A chattering jaw: a second bite. One slap of the tail on the water: one heavy blow; three shakes: three lighter ones that follow you. Rolling as it dives: two rows of spouts; rearing straight up and sinking: spouts under you. Three gulps: bubbles; one long swell: the bomb |
| II · High Water (three pieces of wreckage) | A surge breaks over the arena and the floor stays flooded: walking is 36% slower, dashing is not. New: the coil sweep along the floor | Spines standing up and rattling on the loop: it bounces back off the far wall. Lunges sometimes come back the other way |
| III · Maelstrom (two rocks by the walls) | A whirlpool opens and pulls you towards its eye on the floor (weaker in the air, none on the rocks). New: the Maw, its jaws erupting from the eye past the top of the screen; the eye then moves | The fin circling once: one eruption; twice: a second under you |

Stagger (*BEACHED*): thrown up and slammed down on the shore, gasping, head on the floor; 1.5x damage.
Measured: boss tests lose 1-2 over 36 runs (phase III spouts, where the current drags the scripted dodger
into a column); Vesper wins in 66-77 s, Aster 56-61 s, Lune 90-105 s.

### The Unburied Knight

A death knight with a greatsword. Slow and very wide: its swings cover everything in front of and above
it, and nothing behind it. **Hits on its back deal 30% more.**

| Phase | Attack | The simple answer |
|---|---|---|
| I The Oath | Cleave: a huge swing in front | dash through it to its back, or back right off |
| | Overhead: it strides after you with the blade up, then brings it down (2 damage, two waves) | leave the column, jump the wave, hit it while the sword is stuck |
| | Charge: wall to wall, too tall for one jump | dash through it or jump twice; the wall stuns it |
| | Grip: it drags you in with a cleave already coming | dash past it before the blade lands |
| | Graves: columns come down where you stand, one after another, from the top of the screen to the floor (v1.7c: a jump no longer clears them) | keep walking |
| II The Host | Wraiths: skulls that drift after you | cut them down |
| | Desecrate: patches of ground rot for five seconds | fight on what is left |
| | Whirl: it spins towards you for a couple of seconds | run, take a platform, or jump twice over it; then it is dizzy |
| | Rend: waves from the blade, low and high in turn | jump the low one, stay on the ground for the high one |
| III Blood Oath | Leap: it comes down on you (2 damage) | get out of the circle; it is stuck afterwards |
| | Reap: cleave, back-cut, overhead | stay behind it |

Each of these three is one file (`js/mage.js`, `js/assassin.js`, `js/knight.js`) built on the shared frame in
`js/bosskit.js`: health, phases, stagger and attack selection live there, and the boss file supplies its
attacks (one generator function each), movement and drawing.

## Weight and life

Since v0.6a every action leaves something behind, and each arena moves on its own.

- **Blows:** a hit leaves a bright cut mark, throws sparks the way the weapon was travelling, knocks
  slivers of the boss's own colour out of it, and kicks the view in that direction. The boss shivers for
  the length of the hit-freeze. Finishers add impact lines and a longer freeze. Damage numbers hop.
- **Ground:** footsteps, turns, jumps, landings and dashes raise dust; a long fall lands harder. Anything
  heavy (a boss landing, the maul's finisher, Starfall, a slam) throws dust and stones and cracks the
  floor; explosions leave smoke, drifting embers and a burnt patch that glows until it cools.
- **The arena reacts:** a hard enough blow lifts dust along the whole floor, dips the platforms and shakes
  grit off them, and startles the birds. Platforms give a little when you land on them.
- **Weather:** embers rise in the Warden's ruin, snow falls on the Magus's spires, it rains on the Veil's
  city, ash drifts through the Knight's graveyard, and it all thickens with each phase. Explosions push
  it aside. The graveyard's grass bends away from whoever walks through it. Stars twinkle; bats and
  crows cross the sky.
- **Sound:** soft footsteps, a harder landing, the Knight's footfalls, more low end on hits, and a small
  random change of pitch on sounds that repeat.

Smoke and dust are drawn behind the hero, the bosses and every warning, so they never hide the fight.
The **Screen shake** setting also scales the view kick and the boss's shiver; Off removes all three.

To use these in a new attack, call the ready-made mixes in `js/fx.js`: `G.fx.hit` (a weapon lands),
`G.fx.thud` (something heavy meets the ground), `G.fx.boom` (what an explosion leaves), `G.fx.shatter`
(something of light breaks), `G.fx.dust`, `G.fx.kick` (knock the view a few pixels in a direction).

## Difficulty

| | Health | Boss health | Warnings | Rest between attacks |
|---|---|---|---|---|
| Gentle | 7 | 85% | 30% longer | 30% longer |
| Standard | 5 | 100% | as designed | as designed |
| Merciless | 4 | 115% | 20% shorter | 30% shorter, plus extra hits in several attacks |

## Files

| File | What it holds |
|---|---|
| `index.html`, `css/style.css` | page, menus and in-fight display |
| `js/util.js` | constants, maths, seedable randomness, saved settings, difficulty table (`G.DIFFS`) |
| `js/run.js` | the run: heroes, relics, boons, offers, how each trial scales the boss |
| `js/meta.js` | what lasts between runs: Sunshards, the Shrine (`G.SHRINE`), trophy relics |
| `js/feats.js` | the feats: what each asks, the counters a fight keeps for them, and what they pay |
| `js/flow.js` | the Flow rank and each hero's Dawnbreak |
| `js/finish.js` | each hero's finishing blow at the end of a fight |
| `js/rest.js` | the road between trials, where the boon is chosen, and the crossroads of portals |
| `js/corrupt.js` | corrupted bosses: their drained palette, the pitch-black shape, lightning, aura and tearing; the hook for their own two attacks |
| `js/hexes.js` | the drawbacks of corrupted boons that live in a fight (floor tears, draining, the clock, the boss's hunger) |
| `tools/corrupt-compare.html` | every boss as itself and corrupted, side by side, in the same moment (open it while serve.js runs) |
| `js/omens.js` | the omens (`G.OMENS`) and what each one does during a fight |
| `js/moments.js` | Reckoning, Riposte, Sunder, Clash, Last Light and the last push |
| `js/sets.js` | the four sets' marks on the foe (Ember, Storm, Tide, Gloam), their boons' effects and the crowns |
| `js/hub.js` | the Vigil: the camp between runs, its places, the sparring post, the bell and the lantern |
| `tools/feel-check.js` | whole fights played by a scripted hero, to measure Dawnbreak, Flow and Reckonings |
| `docs/boss-study.md` | the v2.1a study of bosses in other games, and what Solfall took from it |
| `tools/motion-check.js` | every attack, whole fights and every hero, drawn frame by frame, to find motion that pops, flickers or stops dead (see v1.9c) |
| `tools/hitbox-check.js` | every hitbox against what is drawn: where a boss's attacks hit, what of a boss can be struck, each hero's own box, cuts and shots (see v2.1b) |
| `js/input.js` | keyboard, mouse and gamepad mapped to actions |
| `js/audio.js` | every sound and the music, synthesised in code (no audio files) |
| `js/fx.js` | particles, smoke, shards, cut marks, floor cracks and scorch marks, screen shake and kick, flashes, hit-freeze, slow motion |
| `js/draw.js` | drawing helpers shared by heroes and bosses: tapered limbs, joints, cloth |
| `js/arena.js` | palettes and skylines for each boss and phase (`G.THEMES`), platforms, weather, birds, grass |
| `js/hazards.js` | beams, waves, orbs, zones, rings, meteors, weapon swings, pools and their warnings |
| `js/player.js` | the hero: shared movement plus each hero's weapon and special; shared numbers are in `G.PLAYER` |
| `js/boss.js` | the Warden; each attack is one generator function, attack pools are in `BAGS` |
| `js/bosskit.js` | the frame the other bosses share (`G.makeBoss`), and `G.setBoss` |
| `js/mage.js`, `js/assassin.js`, `js/knight.js` | the Magus, the Veil and the Knight |
| `js/wolf.js`, `js/leviathan.js` | the Cinder Wolf and the Drowned Leviathan, each bringing its own backdrop, weather, platforms and sounds |
| `js/kairo.js` | Kairo, the Canyon Fist: his attacks, the breaking ridge, his drawing and his own music (v2.4a) |
| `js/ui.js` | menus, health bars, result screens |
| `js/game.js` | main loop, game states, draw order |

Most-used tuning numbers: `BASE_HP`, `poise0` and `gaps` at the top of each boss file, `G.PLAYER` in `player.js`,
`G.DIFFS` in `util.js`. Bump `G.VERSION` in `util.js` for each build; it shows on the title screen.

## Testing without playing

Open the browser console on the running game.

- **Dodge tests:** `fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs each of the Warden's attacks against a simple scripted player and reports health lost. There are
  52 tests (15 of them for the corrupted Warden's two attacks, since v1.9b) and all lose 0. Set `window.TEST_HERO = 'aster'` (or `'lune'`) to test another hero
  and `window.TEST_SEED = 2` for a different, repeatable set of boss choices.
- **Hitboxes:** `fetch('/tools/hitbox-check.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  plays each boss's attacks and puts the hero at every spot in the arena to see where it would be hit, then
  compares that with what is drawn there ("over": how far from anything drawn a hit can come; "under": how
  deep into a hazard's drawing a hero can stand unhurt), and does the same for what of each boss can be
  struck and for each hero's box, cuts and shots. One boss takes about a minute: set
  `window.HB_PART = 'bosses'`, `window.HB_BOSSES = ['knight']` (or `HB_PART = 'heroes'`). The options are
  at the top of the file.
- **Tests for the other three bosses:** `fetch('/tools/boss-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs every attack of the Magus, the Veil and the Knight in every phase that uses it (158 runs since v1.2a) against one
  scripted player that follows plain rules: step off marked ground, jump low things, leave a swing's reach,
  dash when there is no time to walk. As of v0.6a it loses 0 health as Vesper on seed 1. Across three
  heroes and three seeds it lost between 0 and 6 in 134 runs when last measured (v0.5a), in the Veil's Cuts, the Knight's Whirl and,
  as Lune, things it should cut down but cannot aim at. `window.TEST_BOSSES = ['knight']` limits it to one boss,
  `window.TEST_ONLY = ['requiem']` to some attacks. Since v1.9b it also runs each boss's two corrupted
  attacks (marked `*`), in a corrupted fight. As of v1.9b, as Vesper on seed 1: 8 lost over 296 runs, all in
  old attacks (the Magus's Firewall and Crystals, the Veil's Cuts, the Knight's Whirl, the Wolf's tail
  sweep, the Leviathan's Spouts); the 25 corrupted runs lose 0.
  Run the matching test after changing any attack.
- `G.debug.corrupt = true` makes every fight a corrupted one (its look, its pace and its two attacks).
- `G.debug.god = true` makes the hero invulnerable. `G.debug.boxes = true` (or `?boxes` in the address)
  draws every hitbox.
- `G.debug.boss = 'knight'` makes every fight that boss (`'warden'`, `'mage'`, `'assassin'`, `'knight'`; `''` to stop).
- `G.debug.omen = 'storm'` forces omens on every fight, the first trial included (`'storm,hunted'` for two; `''` to stop).
  With `G.debug.freeze` on, a forced omen starts at once, so the boss tests run with it on top of every attack.
- Tests and god mode earn no Sunshards. `G.debug.meta = true` lets them, for checking the rewards;
  remove `solfall.meta` from the browser's storage afterwards.
- `G.player.ult = 100` fills the Dawnbreak bar.
- `G.debug.forceAttack = 'wheel'` repeats one attack (names are the keys of `G.boss.ATTACKS`;
  use one that belongs to the current phase). `G.debug.nextPhase()` skips to the next phase.
- `G.debug.sim(10, { random: true })` runs ten simulated seconds with random inputs, to shake out errors.
- `G.debug.give('keen')` adds a boon by id; it takes effect in the next fight (`G.startFight()`).

## Not yet checked

- **Sound and music have not been heard by anyone.** They are generated in code and run without errors,
  but the mix and the music are untested by ear. Volume sliders are in Settings.
- **The v0.6a effects have only been seen as still frames.** They were checked in captures of each arena,
  of hits, landings, slams, explosions, a stagger and each boss's death, and cost about 1.2 ms a frame on
  the machine they were written on. How they feel in motion, whether the hit-freeze is now too long or
  the weather too busy, and how they run on a slow machine are unknown.
- **No person has fought the Magus, the Veil or the Knight** (new in v0.5a). Their attacks were checked
  with scripted players and by looking at captured frames, not by playing. Whether they are fun, readable
  at speed and the right length is unknown.
- **Timings were tuned with scripted players.** For the Warden, an invulnerable, always-attacking player
  wins the first trial on Standard in 67 s as Vesper and 74 s as Aster; Lune takes 129 s firing from the
  ground and 97 s at point-blank range. A cruder chasing player of the same kind beats the Magus (3,900
  health) in 88 s as Vesper and 76 s as Aster, the Veil (3,000) in 76 s and 61 s, and the Knight (4,300) in
  68 s and 64 s. A real fight should be about 3 to 4 minutes.
  Boss health, hero balance, relic and boon strength and the per-trial scaling are first guesses.
- **Fastest first trial** on the title screen compares times against whichever boss came first, and
  since v1.8a that is always random, so it is a rough record at best.
- **Nothing in v0.7a has been played.** The Dawnbreaks, the Shrine, the reward screens and each omen
  were run and looked at in captures, and the numbers above were checked in the running game. Whether
  Flow climbs at a satisfying rate, how often Dawnbreak fills in a real fight (the aim was two to four
  times), and whether Sunshard prices are fair are first guesses.
- **v1.3b was measured, not watched.** The pose easing was checked by reading the drawn foot, lean
  and weapon angle frame by frame (they change gradually where they used to jump) and the sharper
  backdrops by emulating a 1920 by 1080 window. Nobody has watched it in motion on a real screen, so
  whether the hero now feels smoother, or a touch slow to settle, is for a person to say. The sharper
  backdrops use more memory (about twice as much at the largest size); how that runs on a small
  laptop is unknown.
- **v1.3a has not been played.** The flourish was run in a fight (plain, brazen, and caught in the
  middle), the bell was rung to a full peal, a scripted hero kept the lantern up for 19 blows by
  striking upward on the exact frame, and a scripted win paid three feats and named them on the
  victory screen. The counters behind Return to sender and Disarmed were checked in the running
  game. Every older test gives the same result as in v1.2a. What nobody knows: whether ten blows on
  the lantern is a fair target for a person, whether a brazen flourish is too safe against slow
  attacks, whether the feat rewards are the right size, and how the bell, the lantern and the
  flourish sound. The gamepad button for the flourish is untested.
- **v1.2a has not been played.** Each tell was looked at in still frames of the running game and both
  forms of each attack were run against the scripted players, with each form forced in turn: Vesper
  loses no health to any of them on two seeds, and the Warden's 37 tests lose none. Aster loses 4 in
  158 runs and Lune 7, to the Veil's Cuts, the Knight's Whirl, the Comet and, as Lune, knives and
  wraiths; that is what they lost in v1.1a (4 and 6) plus one knife from the Veil's fan. Whether the
  tells can be read at full speed, and whether the 2-health forms come too often, is for a person to
  say. The sounds that go with them (a tick for each blink, a stamp) are unheard.
- **v1.1a has not been played.** Aster's sweep, tap smash and fully charged smash were measured on the
  sparring post (20, 40, and 80 plus a 24 wave), and her whole fights by script take about as long as
  before (59 to 64 seconds for a hero that never stops attacking). Whether she now feels heavy in the
  hand is for a person to say. The four new attacks were each run and looked at; the scripted players
  lose no health to them as Vesper (as Aster, 1 in 152 runs, to the Comet's second rally; over every
  attack Aster loses 4 and Lune 6).
- **v1.0a was checked on screen and by script, still not by hand.** Every menu and the fight display
  were looked at in screenshots of the real page; rebinding was tested with simulated key presses, not a
  keyboard; practice fights were started, lost, retried and won by script. Flow's new pace is tuned
  against a scripted hero that never gets hit, so a person's numbers will be lower.
- **The camp's look was judged from captures** taken at each place along it; it costs about 0.6 ms a
  frame on the machine it was written on. How the scrolling feels, and whether three screens is too far
  to walk each time, is unknown.
- **The camp has not been walked by a person.** Every place in it was used by a scripted hero (swapping
  hero, the Shrine, brazier, banner, post, gate) and every way in and out was followed (title, pause,
  defeat, victory). Whether it is pleasant to cross each time, and whether the places are obvious
  without being told, is unknown. On a gamepad the use button is LB, untested like the rest of the pad.
- **The v0.8a moments have not been played.** Each one was triggered in the running game and looked at
  in captures: a Reckoning held and broken against all four bosses, a Riposte from a real perfect dodge,
  a Clash against the Knight's cleave, Last Light and the last push. Whether 6.5 seconds and that much
  ward is a fair race, whether a Clash is too easy or too hard to land, and whether the moments come too
  often are guesses. The tests force single attacks, so they never see a Reckoning; the two blast rings
  on failure use the same ring the Warden's Pulse does, but were not tested with a scripted player.
- **Omens make fights harder than the tests show.** With no omen the boss tests still lose no health.
  With Stormfront or Emberfall forced on top of every single attack, the same scripted player loses 4
  to 6 health in 134 runs, mostly in the Knight's Charge and Grip and wherever it steps into a stone
  while dodging something else. In a real fight an omen strikes far less often than that. Hunted lost
  none. Frenzy lost 2 in 134 (the Magus's burning ground).
- **Gamepad support is untested** (no pad was available).
