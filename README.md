# Solfall

A side-on boss rush for the browser: three heroes, four three-phase bosses, played as a run of
ever-harder trials. You pick a hero and a relic before the run and win a boon after each victory.
Version 1.5a.

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
| Mend one health (costs one segment) | hold E or F while standing | LB or LT |
| Dawnbreak (when its bar is full) | Q or I, or middle click | RT |
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
| The banners | choose the first foe. One banner for each boss hangs on the rail; the lit one comes first, and all four lit means whoever comes. |
| The proving ring | practise against the foe the banners show (or one at random), starting from phase I, II or III. No relic, no omen, no reward, nothing lost; R tries again. |
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

- Your fastest first-trial win against each boss is kept per difficulty and shown at the banners, with how often you have beaten it.
- A welcome line the first time you arrive in the camp each session.
- Dawnbreak in the camp only fires within reach of the sparring post.
- The pause menu lists the trial's omen.
- Settings, Reset progress erases Sunshards, upgrades, trophies and records (it has to be chosen twice).

Not done: touch controls, a colour-blind alternative to red-orange warnings, gamepad rebinding.

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

All three share movement, the dash, Starlight and mending. Weapon and special differ.

| | Vesper, the Starblade | Aster, the Starmaul | Lune, the Moonbow |
|---|---|---|---|
| Health (Standard) | 5 | 6 | 4 |
| Weapon | sword: 10 down, 12 back up, then a 26 finisher | maul: a wide sweep in front (20), then a smash that shakes the ground (40). Hold the smash to charge it, up to 60; fully charged it also throws a wave along the floor (14) | bow: arrows of 4, 5, then a piercing 10, in any direction; up to 60% stronger within 120px, up to 30% weaker past 240px |
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
  (drawn from nine, up to thirteen once trophies are won), and step through the gate. The relic lasts the whole run.
- Each trial is one boss. The four come in a shuffled order, and when all are beaten the order is
  shuffled again. The **banner** in the camp fixes who comes first (handy for practising one boss).
- Beating a boss offers **three boons; you keep one** and go straight into the next trial. The victory
  screen names the boss that is next.
- Each trial after the first gives the boss 15% more health, 4% shorter warnings and 6% less rest.
  From trial V (the second time round) the bosses also use their Merciless patterns.
- Health is restored between trials. Falling ends the run; the gate in the camp shows the deepest trial reached.
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

The last blow of each fills the stagger bar like a Star Lance. When a boss falls, a finishing cut crosses the screen.
Numbers are in `js/flow.js`.

## Moments (new in v0.8a)

Set pieces and rewards that punctuate a fight. All of them are in `js/moments.js`.

| Moment | When | What happens |
|---|---|---|
| **Reckoning** | once in phase I (below five sixths of the boss's health) and once in phase II (below half) | The boss goes to the middle of the arena, wraps itself in a ward and gathers a blast while a red ring closes on it for 6.5 seconds. Hits go to the ward, shown as a gold arc. Break it and the boss is thrown down staggered, Dawnbreak gains a quarter of its bar and the fight pays 6 more Sunshards. Let the ring close and two blast rings go out: dash through each. |
| **Riposte** | the first weapon hit within 1.5 seconds of a perfect dodge | double damage, with a freeze and a gold cut |
| **Sunder** | the first finisher on a staggered boss | 2.2 times damage, a longer freeze and a cracked floor. One per stagger. |
| **Clash** | a finisher, a dash thrust or a heavy arrow lands on the Veil or the Knight in the 0.3 seconds before its weapon swing lands, with you inside the swing | the swing is stopped dead; you are pushed back unharmed with 20 Starlight |
| **Last Light** | the first time in a fight a hit leaves you on 1 health | time slows, you cannot be hurt for 2.4 seconds, Dawnbreak gains 35% and Starlight half a segment |
| **One last push** | the boss drops below a tenth of its health | a call-out; the boss bleeds light and the screen pulses until it falls |

The ward's strength is sized to the hero: about 3.3 seconds of steady attacking (158 for Vesper, 165 for
Aster, 86 for Lune on Standard), more in later trials. A Dawnbreak breaks it outright. Each boss names
its own Reckoning: Eclipse, Convergence, Death Mark, Dirge. A Reckoning is skipped if the boss leaves
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
| Swift Mend | Starlight | mending takes half as long | 1 |
| Mirror Step | Starlight | Vesper and Lune: a perfect dodge fires a free shot at the core | 1 |
| Steady Heart | Survival | one more health | 3 |
| Second Dawn | Survival | once per trial, a killing blow leaves you on 1 health | 1 |
| Glass Star | Risk | all damage +35%, one less health | 1 |

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

### The Unburied Knight

A death knight with a greatsword. Slow and very wide: its swings cover everything in front of and above
it, and nothing behind it. **Hits on its back deal 30% more.**

| Phase | Attack | The simple answer |
|---|---|---|
| I The Oath | Cleave: a huge swing in front | dash through it to its back, or back right off |
| | Overhead: it strides after you with the blade up, then brings it down (2 damage, two waves) | leave the column, jump the wave, hit it while the sword is stuck |
| | Charge: wall to wall, too tall for one jump | dash through it or jump twice; the wall stuns it |
| | Grip: it drags you in with a cleave already coming | dash past it before the blade lands |
| | Graves: spikes erupt where you stand, one after another | keep walking |
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
| `js/omens.js` | the omens (`G.OMENS`) and what each one does during a fight |
| `js/moments.js` | Reckoning, Riposte, Sunder, Clash, Last Light and the last push |
| `js/hub.js` | the Vigil: the camp between runs, its places, the sparring post, the bell and the lantern |
| `tools/feel-check.js` | whole fights played by a scripted hero, to measure Dawnbreak, Flow and Reckonings |
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
| `js/ui.js` | menus, health bars, result screens |
| `js/game.js` | main loop, game states, draw order |

Most-used tuning numbers: `BASE_HP`, `poise0` and `gaps` at the top of each boss file, `G.PLAYER` in `player.js`,
`G.DIFFS` in `util.js`. Bump `G.VERSION` in `util.js` for each build; it shows on the title screen.

## Testing without playing

Open the browser console on the running game.

- **Dodge tests:** `fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs each of the Warden's attacks against a simple scripted player and reports health lost. There are
  37 tests and all lose 0 as of v1.2a. Set `window.TEST_HERO = 'aster'` (or `'lune'`) to test another hero
  and `window.TEST_SEED = 2` for a different, repeatable set of boss choices.
- **Tests for the other three bosses:** `fetch('/tools/boss-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs every attack of the Magus, the Veil and the Knight in every phase that uses it (158 runs since v1.2a) against one
  scripted player that follows plain rules: step off marked ground, jump low things, leave a swing's reach,
  dash when there is no time to walk. As of v0.6a it loses 0 health as Vesper on seed 1. Across three
  heroes and three seeds it lost between 0 and 6 in 134 runs when last measured (v0.5a), in the Veil's Cuts, the Knight's Whirl and,
  as Lune, things it should cut down but cannot aim at. `window.TEST_BOSSES = ['knight']` limits it to one boss.
  Run the matching test after changing any attack.
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
- **Fastest first trial** on the title screen compares times against whichever boss came first, so it is
  only a fair record when the camp's banner is set to one boss.
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
