# Solfall

A side-on boss rush for the browser: four heroes, seven three-phase bosses, played as a run of
ever-harder trials. You pick a hero and a relic before the run and win a boon after each victory.
Version 3.1i.

This is an early slice of a planned boss-rush roguelite (short runs, a boon after each boss,
bosses drawn from a pool). A run is seven trials, one for each boss, each harder than the last: the first boss
at random, then whichever portal you walk into. A final eighth fight, behind the Last Portal, is still to come.

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
| Flourish (a salute that leaves you open) | T or G | Back |
| Use item 1 / item 2 (bought from the road merchant) | 1 / 2 | press the left / right stick |
| Drop through a platform | S + Space | down + A |
| Your hero's moves (the fight waits while it is up) | hold Tab, or Moves in the pause menu | |
| Help: how a fight works and what every word means | Help on the title screen or in the pause menu | |
| Pause | Esc or P | Start |
| The Guide: a picture book of the camp, controls and screens | Guide in the pause menu (opens by itself the first time) | |
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

## The Last Wave's scene, rarer corruption, a rest for the stagger bar, Eos down a little (v3.1i)

After a trial V run that "felt kinda ridiculous" (the Monk at 3% in 57 seconds, then four health lost to the
Last Wave), asked for four things.

**"the last wave is a bit weird, i think it should have a cutscene that leads to it"**
- When Kairo drops below 12% the fight stops: the bars come in and the hero is held where they stand (brought
  down to the floor first). He is on a knee, spent; he stands and roars; he leaps to the far end. The view cuts
  close to the hero, whose weapon lights. Then the gathering and the wave. About 2.7 s before the gathering.
- Neither of you can be hurt from the start of the scene until the push is decided.
- The push starts further from the hero (0.3 of the way, from 0.12), so it is no longer lost in half a second.
- The key to press shows over where the two meet, as it does in Aurel's Black Dawn.
- Not changed: what losing costs (2 health, 3 from trial V) and how fast the wave pushes.

**"the corrupted boons should be less common and cost more to cleanse"**
- A corrupted boon takes a card's place on **one offer in five** (from two in five).
- The Fountain costs **80, 160, 320** Motes (from 50, 100, 200).

**"the stagger bar for a boss should have a grace period after a stagger is done"**
- For **4 seconds** after a boss gets up from a stagger its bar takes nothing, from any source, and shows dim.
  Every boss. Forced staggers (winning the Last Wave, Dying Light) still work. Kairo's Gathered Sun bar is its own
  and is not affected.

**"eos feels very strong but fair enough - maybe lower numbers a bit?"**
- Cuts 10, 12, 25 (from 11, 13, 27). The draw 20 and 10 a notch, 80 at six (from 22 and 11, 88).
  Still Point's cut 14, and 40 on a perfect block (from 16 and 44).
- The bot, unhurt and with no boons, against four bosses: Eos won in 131 s on average against 149 s for the other
  three heroes, 12% faster. Before, 121 s against 145 s, 17% faster. Two fights a pairing, so a rough figure.

Checked: the scene frame by frame, won and lost; the bar after a stagger on the Knight and the Warden. Not played
by a person.

## Eos: the Still Moment (v3.1h)

Asked: "i want the right click on a perfect block to slowmo the game and have a biiiit longer animation for the
slash, make it epic, different from dawnbreak tho".

A perfect block (Still Point raised within 0.18 s of the blow) now plays a sequence of about a second:

1. **The world all but stops** (5% speed), the edges of the screen go dark and the view leans in a little. The
   boss's move is already over, and it hangs where it was. The sparks of the block hang in the air.
2. **Eos is gone, and five cuts cross the boss**, one after another from alternating sides, each a thin line left
   hanging with a shade of him at its end. Each cut sounds a little higher than the last.
3. **He is standing behind it with his back to it**, and the blade goes home slowly.
4. **At the click** every line lights gold at once, the 44 lands as one blow, the sheath fills, and time comes back.

How it differs from Dawnbreak (Horizon): no name banner, no cut across the whole arena, no split picture. It
stays close on the two of them, and it is many small cuts that land together, not one.

- Nothing can hurt him during it, and he cannot act until the click. He has half a second of safety after it.
- If the boss's move cannot be stopped (the 7 s cooldown, Noon, a ward), the sequence still plays and the boss
  only moves at 5% speed through it.
- A blocked shot plays the same sequence, ending in the air beside a high caster.
- A plain block (raised early) is unchanged: the quick step-through for 16.
- The naginata's sweep and the sheath's chime now come at the click.

Checked frame by frame against the Knight and the Warden, with a refused break, and `tools/break-tests.js` again
on the Knight, Kairo, the Warden and Sol: clean. Not played by a person, and not heard: the sounds were chosen from
the ones he already has.

## Eos: Still Point answers back (v3.1g)

Asked: "Eos right click should have a special attack when you land it, like small invul frames if you successfully
block an attack and a unique dash through the boss attack/counter mechanic where it stops the boss mid pattern".
Three ideas were picked from five: a cut on every block, a stronger one for a late block, and a blink for shots.

- **Any blow turned by Still Point is answered.** Eos steps through whoever struck him and comes out behind it,
  cutting on the way for **16**. He cannot be hurt for 0.6 s (from 0.5). The sheath still fills, so the draw is
  the follow-up, and he can act at once: the blade is already going home.
- **A blow turned late is a perfect block.** If the guard went up within **0.18 s** of the blow landing, the cut
  deals **44** and the boss's move stops: what it had thrown is gone and it reels for 0.65 s before it thinks
  again. In practice: brace on the glint of the blade, not before it.
- **A shot or a spell that is turned takes him to its caster.** He is gone and past whoever cast it, cutting as
  he goes; if the caster is high up (the Warden's eye, the Magus) he arrives in the air beside it. A late block
  does the same as above.
- A pit, a wire, the storm or burning ground is only turned, as before.
- **Limits on stopping a move.** Once every 7 seconds per boss. Never during a phase change, a ward, a stagger,
  Kairo's sun, Aurel's Black Dawn, Sol's Noon form or her last light. When it is refused the heavier cut still lands.
- The naginata's sweep (60) and **Second Light** come on top, as before.
- Every boss has the reel. Aurel and fallen Sol are rocked back in a pose of their own; the others rock and shake.

Checked: `tools/break-tests.js` (new) starts every attack of every boss in each phase and cuts it short at three
different moments (1,197 tries; 102 were refused as they should be, 90 of them Sol's Noon), then watches for errors, a boss that never attacks again, one left in the
air, or a hero still held. All nine bosses came back clean. With real button presses against the Knight, Aurel and
Kairo, a guard raised 0.2 s or more before the swing gave the plain cut and one raised later gave the perfect one.
Not played by a person yet, and the numbers (16, 44, 0.18 s, 7 s) are first guesses.

## Lune's Moon Burst, and a Merciless balance pass (v3.1f)

Asked: "run a full boss balance check across merciless on each boss", then that Lune's right click could be
"detonating arrows that are stuck on a boss" ("feels weak"), and "boss tuning probably needs it".

**Lune: the Moon Burst replaces the Moon Volley** (the bow only; the crossbow keeps Triple Bolt).
- Every arrow that hits stays in the foe where it struck: up to 12 at once, each for 6 seconds. They ride the
  foe as it moves and turns, and the point of light at the nock beats faster in an arrow's last second and a half.
- Right click sets them all off, one after another in the order they went in: 6 each, 12 for a piercing arrow.
  The pops climb in pitch, and the last one lands with a held beat and a push of air. She springs back from the foe
  as it starts.
- With no arrows in the foe, right click does nothing and costs nothing.
- A full load (12, four of them piercing) burst for about 130 on Standard; the Volley did 50 to 80.
- **Full Quiver** now lets 20 arrows stay in, for twice as long. **Harvest Moon**: every third Moon Burst is free.
- Her own sounds (the string snapped on nothing, the pops, the last crack): none of them is a boss's.

**What the Merciless check found** (the bot, `tools/clear-rates.js`: every boss with every hero at trials I, IV
and VII, 4 runs, with boons; Aurel at III and V; Sol at VII):

| | Before | After |
|---|---|---|
| Leviathan | 71% | 67% |
| Assassin | 48% | 56% (not changed) |
| Mage | 52%, wins in 200 s | 58%, 213 s |
| Knight | 10% → 31% once the bot could dodge Sever | 27% (not changed) |
| Wolf | 15% | 19% |
| Warden | 17% | 13% |
| Aurel | 6% | 19% |
| Kairo | 4% | 8% |
| Sol | 0 of 24 | 0 of 24 |
| All seven trials | 31% | 35% |

By hero, before → after: Eos 46% → 44%, Vesper 35% → 37%, Aster 30% → 43%, Lune 13% → 17%. With 48 fights a
boss, a number can be off by about 13 points either way.

What changed:
- **Warden:** health 5400 → 4700 (it took longest to kill), and more rest between attacks in every phase
  (0.95 / 0.75 / 0.6 → 1.05 / 0.84 / 0.72; before trial V, phase III 0.76).
- **Kairo:** health 2700 → 2500, rests 1.0 / 0.8 / 0.72 → 1.05 / 0.9 / 0.82.
- **Wolf:** rests 0.95 / 0.78 / 0.62 → 1.0 / 0.84 / 0.7.
- **Aurel:** rests 0.95 / 0.75 / 0.58 → 1.0 / 0.82 / 0.66.
- **Sol**, a light touch: rests 1.0 / 0.78 / 0.66 → 1.05 / 0.85 / 0.72.
- **Leviathan** a little harder: rests 0.76 / 0.62 / 0.5 → 0.7 / 0.57 / 0.46.
- **Mage:** health 3900 → 3500, as its fights ran longest.
- **Eos** (won most and killed fastest): a draw is 22 and 11 more per notch (88 at six), was 25 and 12 (97).

These are base numbers, so Gentle and Standard move the same way.

The bot itself was taught two things it got wrong: it jumped the Knight's Sever cuts, which are aimed at you
(it now dashes through them), and it never answered the Warden's charge (it now dashes out of the line once the
core trembles). The Warden is still the bot's hardest after Kairo; its damage comes from a dozen moves at once,
not one. The Leviathan barely moved: as in v2.9g, it needs a harder move, not numbers. The bot cannot beat Sol on
Merciless at all, so her numbers need a person's run.

Playtest checklist:
- Lune: does the Moon Burst feel like a payoff? Can you see how many arrows are in? Is 6 seconds long enough?
- Is the Warden fair on Merciless now? Kairo?
- Does the Leviathan still feel easy?
- Eos: still strong enough at 88?

## Eos: the Notched Blade (v3.1e)

Eos "feels weird"; of three drafts the user picked the Notched Blade: every hit feeds the draw, with no gate.

- **Every cut of the string that lands notches the sheath**, up to six (six bands down the sheath; all six and it is
  traced in gold).
- **Hold attack a moment (about a quarter second) and let go to draw**, with any number of notches. The draw spends
  them all: 25 damage and 12 more per notch (37 with one, 97 with six). Six notches also carry it furthest and count
  as a full draw (the Dawn Scabbard, Second Sun). Let go before it arms and nothing is spent.
- So a quick one- or two-notch draw is a way out or a reposition; six after a stagger is the payoff.
- **Still Point:** a turned blow fills all six. **Second Sun** (his boon): a full draw leaves three notches.

Tested frame by frame (one cut, one notch; a short hold spends nothing; 37 from one notch, 97 from six; a seventh
cut does not overfill). Bot, Eos against the seven bosses at Standard trial V, four runs of 21 fights: 40 of 84 won,
kills about 152 s, level with v3.1d (about 50%, 164 s) and v3.1c (52%, 157 s). The bot only draws from six.

Playtest checklist:
- Does the string flow into the draw now? Is the quarter-second hold right?
- Are small draws useful (a two-notch draw to get out), or is it always best to wait for six?

## Eos: the draw is a charge (v3.1d)

Asked: "LC LC LC, get one stack, LC LC LC get another stack (as long as the third strong hit hits the stack is
gotten) then unlocks the charge attack". Until now a full sheath turned the very next press into the draw, which
swallowed the string.

- A press is always the next cut. Each string whose finisher (the third, strong hit) lands puts one in the sheath;
  two fill it, and it glows gold.
- With a full sheath, **hold attack**: she sets her feet behind the sheath and its three marks light one by one
  (about half a second). Let go with all three lit and she draws, blinking through the foe. Let go sooner and nothing
  is lost: the sheath stays full. A blow taken while charging cancels the charge, not the sheath.
- The draw now deals **80** (from 60), since it costs a charge. Still Point's turned blow still fills the sheath at
  once.

Tested: frame by frame (two strings fill it; a tap with a full sheath is a cut; a short hold keeps the sheath; a full
hold and release draws). Bot, Eos against the seven bosses at Standard trial V, 21 fights: before 11 won, kills
157 s on average; with the charge at 60 damage 10 won, 202 s; at 80 damage 10-11 won, 159-169 s.

Playtest checklist:
- Does LC LC LC, LC LC LC, then hold and release feel right? Is the charge too slow or too quick?
- Is it clear when all three marks are lit (the gold ring and chime)?

## Tabs change on a click, not a hover (v3.1c)

In the Journal, the Tally and Help, moving the mouse over a tab only highlights it; the page changes when you click
it. With the keyboard or a pad, the page still follows the highlight as you move.

Playtest checklist:
- Journal, Tally, Help: sweep the mouse down the tabs. Does the page stay put until you click?

## A polish pass over every screen, in English and Japanese (v3.1b)

Asked for "a full ui and text (eng and jp) polish". Every screen, camp place and road stop was captured in both
languages (79 shots each) and checked side by side. What changed:

- **Camp and road labels:** the label of the place you stand at now sits on a soft dark plate, so it reads over the
  brightest sunset. The small names of the places it would cover step aside while it shows. A long description
  (relics, the wardrobe) wraps onto two balanced lines instead of running across the Gate.
- **HUD:** soft shade behind the top corners, and the omens get their own backing, so they read over Sol's sun.
- **Help:** "A run" was taller than the screen and pushed the panel off the top. It is now two pages, "A run" and
  "Boons". Page intros use the full width instead of wrapping at half.
- **Controls:** each key is its own chip ("Shift  K  C  R Shift" ran together).
- **Results:** the defeat screen names a boss's moves as the Journal does ("The last blow was its Overhead.", not
  "its souls."). The end screen's road fits on one line. "Kindled , after trial II" lost its stray space.
- **Japanese:** the title logo lines up with the menu again; no fake italics (Japanese is set upright); lines wrap
  at phrase breaks; the camp and road use a Japanese face; phase cards, callouts and panel titles keep a little
  letter spacing; small labels (meters, hero titles) are a touch larger. A corrupted portal reads 穢れた門.
- **Fixed:** the Help entry for the Cleansing Fountain said it costs Sunshards (it costs Motes).

Checked: both languages, every screen, no stray English or placeholders in Japanese; 36 bot fights per language
across all nine bosses with no errors.

Playtest checklist:
- Walk the camp and the road: is every label readable over the sky, with nothing overlapping?
- A fight on a bright arena (Sol): meters and omens readable?
- Help: "A run" and "Boons" pages fit; Controls shows key chips.
- In Japanese: anything still cramped, cut off or oddly wrapped?

## Japanese (v3.1a)

Asked for "a complete japanese language translation to everything" with a toggle at the start. The title screen
now has **English / 日本語** under Settings; picking one reloads the game in that language. The first time, the game
follows the browser's language. Everything a player reads is translated: menus, help, the guide book (with its own
Japanese screenshots), the Journal, the Tally, heroes, weapons, boons, relics, items, omens, the Shrine, the camp and
road labels, boss names, phase cards, callouts, tips, the results screens and the ending. About 1,700 phrases.

How it works, for later changes:
- English is still written in the code. Text a player reads goes through `G.T('English {0}', value)`, which returns
  the Japanese when the game is in Japanese, else the English unchanged. A phrase with no Japanese falls back to
  English, so a new line never breaks anything; it just shows in English until it is translated.
- The Japanese lives in `js/lang/ja-*.js` (data, journal, ui, camp, bosses). Data tables (heroes, boons, relics...)
  are rewritten by id in Japanese only; the page's own text is matched phrase by phrase.
- `js/lang/glossary.md` fixes every name and game term (ヴェスパー, 星光, 暁光, 恩恵, 遺物, 崩し, ジャスト回避...) and
  the style: short, plain game Japanese, no です／ます in descriptions.
- Japanese uses Japanese fonts (Yu Gothic / Hiragino / Noto Sans JP, Yu Mincho for titles) and tighter letter spacing.

Also fixed: since v3.0d, health bought from the merchant, its stock and the mend count carried over into the next
run (a comment had swallowed the line that resets them).

Playtest checklist:
- Title: switch to 日本語 and back. Does the game come back in the language you picked after a reload?
- Read through the hero picker, help, guide, Journal and Tally in Japanese: anything still in English, cut off or
  overlapping?
- A run in Japanese: camp labels, boon cards, the merchant, phase cards, callouts, the win and defeat screens, Sol's
  ending.
- Does the Japanese read naturally? Note any line that feels stiff.
- Health bought from the merchant should be gone at the start of the next run.

## Weapon forms: a second weapon for each hero (v3.0e)

Part 4 of the plan. Asked for "a new weapon each". Beating Sol with a hero unlocks their second weapon. Take it from
the **weapon rack** in the yard, next to the sparring post. The rack glows once a weapon is waiting; use it again to
go back to the hero's first weapon. The end screen tells you when one unlocks, and the echoes in the Hall of Echoes
carry the weapon their hero has chosen.

| Hero | Weapon | Attacks | Special |
|---|---|---|---|
| Vesper | **Twin Blades**: two short swords | cut 7, cut 8, crossed finisher 20; quicker than the sword, and every cut is a cross (the second blade cuts the other way) | **Crossing Stars**: two crescents of light for 30 each, crossing in an X across the arena |
| Aster | **Star Gauntlets**: two plated fists | jab 8, cross 9 (straight punches), haymaker 22; short reach, fast, no charged smash | **Meteor Fist**: lunge forward and punch out a short, wide burst of starlight for 54 |
| Lune | **Moon Crossbow** | bolts 9, 10, then a heavy bolt 24; slower than the bow, harder per shot, still strongest up close | **Triple Bolt**: three heavy bolts for 16 each (more up close) in a tight spread, and a hop back |
| Eos | **Dawn Naginata**: a curved blade on a long pole | sweep 15, sweep 17, finisher 40 that sends a short crescent on for 20; the longest reach of any weapon, no sheath or draw; stood upright at rest | **Still Point** as before, but a turned blow is answered with a sweep all around you for 60 |

How it works:
- Each new weapon moves like one the game already has: the twin blades, gauntlets and naginata swing like the
  sword, and the crossbow shoots like the bow. Each is drawn as itself.
- Boons built on the first weapon's special or mechanics are not offered while you carry the second one. These are
  Split Lance, Pinning Lance, Twin Stars, Aftershock, Starborn, Fault Line, Unbroken, Full Quiver, Harvest Moon,
  Hanging Cut and Second Sun.
- With the naginata, Eos's Dawn Scabbard throws its crescent on every second finisher, since there is no draw.

How they were tested. A bot can't feel fun, so this is what it can measure:
- **The bot matrix:** every boss with every hero, each weapon, at Standard trials II and V and Merciless trial III,
  3 runs each, plus a pass where the bot can't die (time to kill = raw damage).
- **Frame-by-frame sheets** of each weapon's string and special, checked by eye.

What the sheets turned up, now fixed:
- Vesper's second sword never swung.
- Aster's punches showed sword slash arcs, and Meteor Fist lunged her into the boss.
- Triple Bolt did 114 point blank, far more than any other special.
- The naginata's blade dragged in the floor at rest.

What the matrix turned up, now tuned:
- **Gauntlets** were too strong: they killed a third faster than the maul. Now jab 8, cross 9, haymaker 22, and
  Meteor Fist 54.
- **Naginata** was much too weak: it won 24% at trial V against the sheathed blade's 62%. Now 15/17/40, plus the
  finisher's crescent.
- **Crossbow:** slightly quicker shots.

Bot wins after tuning (first weapon then second, 21 fights each):

| Hero | Standard trial V | Merciless trial III |
|---|---|---|
| Vesper | 48% / 48% | 29% / 38% |
| Aster | 33% / 48% | 33% / 52% |
| Lune | 29% / 33% | 10% / 0% |
| Eos | 62% / 57% | 48% / 43% |

Raw damage (time to kill, first then second): Vesper 153 s / 121 s, Aster 165 s / 144 s, Lune 144 s / 186 s,
Eos 135 s / 126 s.

Notes:
- The bot plays the maul's charge and Lune's slower shots badly, so read the Aster and Lune rows with care.
- In a direct test where both stand and fire, the crossbow deals about 15% more than the bow.
- The test also found a rare crash in Eos's Horizon (Dawnbreak): one line read the swing after it had been cleared.
  It could happen with either weapon, and it is fixed.

Playtest checklist:
- Does each weapon feel different enough from the first one, and cool?
- The naginata: strong enough without the draw?
- The gauntlets: do the punches read as punches?

## Ascension unlocks: what each step gives a hero (v3.0d)

Part 3 of the plan. Beating Sol on an Ascension step for the first time with a hero unlocks that step's reward for
that hero. The end screen says what you got.

| Step beaten | Unlock |
|---|---|
| +1 | **Ascendant costume**: pale violet and gold, a crown of rays over the head, and rising motes of light on every blow. Wear it from the Wardrobe. |
| +2 | **The hero's own relic**, offered at the reliquary only to that hero (below). |
| +3 | **A third item slot** (key 3; Back on a gamepad, which then uses the item instead of a flourish in fights). |
| +4 | **The hero's own boon**, which can then be offered like any other (below). |
| +5 | **The Unfallen**: a golden aura, the title "The Unfallen" in place of the hero's own, and a gold star over their alcove in the Hall. |

**The heroes' own relics** (each awakens at II, IV and VI like the others):
- **Vesper, North Star:** every third finisher that lands throws a free Star Lance at the foe.
  - Kindled: every second finisher.
  - Awakened: a perfect dodge throws one too.
  - Ascendant: the free lances deal double.
- **Aster, Meteor Heart:** every second finisher that lands lets out a Starfall around you at half strength.
  - Kindled: 40% wider.
  - Awakened: each one fills a quarter of a segment of Starlight.
  - Ascendant: every finisher.
- **Lune, Moonlit Quiver:** a perfect dodge looses three arrows at the foe.
  - Kindled: five arrows.
  - Awakened: it also fills half a segment of Starlight.
  - Ascendant: the arrows deal double.
- **Eos, Dawn Scabbard:** a full draw also throws a crescent of light at the foe.
  - Kindled: as strong as Second Light's.
  - Awakened: a full draw fills a quarter of a segment of Starlight.
  - Ascendant: a second crescent follows the first.

**The heroes' own boons:**
- **Vesper, Twin Stars:** a second Star Lance trails the first, at half strength.
- **Aster, Starborn:** Starfall reaches 30% further, and one that strikes gives back half a segment of Starlight.
- **Lune, Harvest Moon:** every third Moon Volley costs no Starlight.
- **Eos, Patient Blade:** Still Point braces half again as long.

Checked in the preview, for each hero with every step beaten:
- The costume is in the Wardrobe and the title reads The Unfallen.
- Only that hero is offered their own relic, and their own boon is open.
- There are three item slots, and the HUD shows the third.
- Each relic fires as described: lances, a Starfall, arrows, and the crescents.
- The Hall shows the crowns, the step marks and the stars.

No errors.

Playtest checklist:
- Are the hero relics and boons worth taking over the others? Too strong?
- The Ascendant costumes and the golden aura: cool enough for a reward?
- Is Back for the third item fine on a gamepad?

## Ascension: five steps above Merciless, one ladder per hero (v3.0c)

Asked: "an ascension mode like sts, +1 to +5, each making the bosses harder in their own way (stacking the
difficulties)", based off Merciless, per hero. This is part 2 of the plan. What each step unlocks (costume, hero
relic, third item slot, hero boon, golden aura) is part 3 and comes next.

**How it opens.**
- Beat Sol on Merciless with a hero: Ascension +1 opens for that hero.
- Beat Sol on +1: +2 opens, and so on up to +5.
- Each hero has their own ladder.

**How to choose it.** The Brazier now steps Gentle, Standard, Merciless, then each Ascension step your hero has
open, then back to Gentle. It burns violet on Ascension, with a lit mark on the plinth for each step. Switching to
a hero who hasn't reached that step drops you back to the highest one they have.

**The steps.** Each step keeps everything below it:

| Step | Name | What it adds |
|---|---|---|
| +1 | Quickened | warnings 15% shorter, 10% less rest between attacks |
| +2 | Hardened | bosses 15% more health, stagger bar 25% longer, staggers 20% shorter |
| +3 | Their own way | each boss does one thing harder (below) |
| +4 | Lean road | 2 boons offered instead of 3, 25% fewer Motes, the merchant 25% dearer |
| +5 | Ill omens | an omen on every trial, two from trial IV |

The +3 twists, one per boss (the pause menu shows the current boss's):
- **Warden:** broken hands come back twice as fast.
- **Wolf:** its fire burns half again as long.
- **Knight:** his thrown sword comes back sooner.
- **Kairo:** the Gathered Sun bar is a quarter longer.
- **Aurel:** feints from the start, and more often.
- **Sol:** the eclipse's cold sets in faster.
- **Magus:** one more ice shard.
- **Veil:** one more mirror image.
- **Leviathan:** one more bite before it sticks fast.

**Other details.**
- Every Ascension step keeps its own records (fastest first trial, deepest trial, runs won), and the HUD and
  pause menu say "Ascension +3".
- Sunshards pay a tenth more per step.
- The end screen says when you beat a step and which step just opened.
- In the Hall of Echoes, small violet marks under a hero's sun crown show the highest step they have beaten.

Checked in the preview:
- The ladder, the Brazier order and the drop back when switching heroes.
- At +5: health, warnings, rest, stagger, Motes, prices, 2 boons, and the omen counts at trials I and IV.
- Every boss, Aurel included, fights on +5 under the bot with no errors.

Bot win rates, one fight at trial IV, all heroes, 56 fights each: Merciless 36%, +3 21%, +5 18% (wins take 168 s, 194 s and 222 s on average). The bot cannot test +4 and +5 properly, because their boon and omen changes act over a whole run.

Playtest checklist:
- Does each step feel harder than the last? Is +5 too much?
- Do the +3 twists feel like each boss's own, and are any unfair?
- Is it clear at the Brazier which step you are on and what it adds?

## Sol: the sun cracks like glass (v3.0b)

Asked: "i think the cracks from phase 1 to phase 2 could look more natural".

- **On the sun:** the cracks were a few fixed straight lines that grew towards the middle. Now they are a fracture
  that spreads from a point near the heart: jagged cracks that branch and thin out as they go, darker and wider
  each time the sun cracks.
- **In the sky:** the cracks were seven stiff lines from the middle of the sky that appeared a piece at a time
  and looked like lightning. Now they run out from the sun itself, wherever it is when it breaks:
  - straight-ish cracks with small kinks and a few branches;
  - two rings of short cracks round the sun, like a struck pane of glass.

  They spread smoothly on each of the three cracks and shatter outward when the sun bursts. When Sol dies they
  close up again as the dawn comes back (before, they stayed and looked like lightning in the dawn).

Video: shots/sol-cracks-v30b.mp4.

Playtest checklist:
- Do the cracks look like breaking glass now?

## The ending: dawn, the end screen, and morning at the Vigil (v3.0a)

Asked: "create a sort of end screen too now! like a small epilogue and a button to go back to the hub, maybe changing
it a bit to show the victory". This is part 1 of the plan; Ascension (+1 to +5), its unlocks and weapon forms come next.

**The dawn.** After Sol's death scene the picture fades to black, then to your hero standing alone on a ridge above
the clouds. The view starts close on them and draws back and up while a new sun rises out of the cloud and the sky
turns from night to morning. Three lines come in one at a time:
- The sun fell.
- You carried its light home.
- Morning comes to the Vigil.

Any button skips ahead.

**The end screen: "The run is won".** It shows:
- your hero and difficulty;
- fight time, hits taken and perfect dodges for the whole run;
- the Sunshards the run earned (leftover Motes included);
- the bosses in the order you beat them, with corrupted ones marked, plus Aurel if you beat him, then Sol;
- your relic, crown, duo and boons;
- an **Unlocked** list: dawn at the Vigil (first win), a sun crown for this hero, a costume, a trophy, and any feats.

**Return to camp** goes straight back to the Vigil.

**The run ends at Sol.** The Last Portal now says when corrupted portals are still open: they close once you go in.
The first touch warns you ("Corrupted portals close once you go in. Touch again to go"), and the second goes in.

**Morning at the Vigil.** After the first time any hero beats Sol, the camp stays at dawn:
- a blue and gold morning sky;
- the sun lit (it was a black disc);
- most stars and the moon faded;
- the gate's keystone turned into a small lit sun.

In the Hall of Echoes a small sun crown turns over every hero who has beaten Sol. The first time back you see
"Morning, at last" over your hero.

Checked in the preview:
- Sol's real death scene runs into the dawn, the end screen and back to camp with no errors.
- The warning at the Last Portal works.
- The camp, Hall crown and gate sun draw at dawn.

Video: shots/sol-ending-v30a.mp4.

Playtest checklist:
- The dawn: does it feel like an ending? Too long, too short?
- The end screen: anything missing you want to see?
- The dawn camp: does it feel like the camp has changed? Is the sun hidden too much behind the aqueduct?
- The Last Portal warning: clear enough?

## Sol: her hands become her blade, and a black sun for the Eclipse (v2.9q)

Asked: "i think phase 2 to phase 3 could be cooler - and i think phase 2 could involve sucking in the hands to form
the sword and make sure it looks sleek and polished".

**Noon to the Fall: the blade is made from her hands.** When the sun bursts, her hands no longer blow apart: their
arms of light snap and they hang slack in the sky while she falls. The gnomon breaks when she lands. After her
eyes open she raises her hand to the sky:
- the hands wake (their glyphs flare, the fingers open);
- they swing out and over and dive in to her on two curving trails of light, turning, faster and smaller as they
  come, and pour into her raised fist with a flash and a ring;
- the light runs up out of her fist into the blade, with a glint at the tip;
- one clean cut down and across, leaving afterimages and a slash in the air, then the blast and the close-up as
  she points it at you.

**The Fall to the Eclipse: a black sun.** After she drives the blade into her crown, a black sun (the same design
as her Black Sun attack, ringed with dark blades edged in ember) rises out of nothing behind her and grows huge as
every light in the world pours into it; the view backs right out to take it in. At totality a single point on its
rim flares white (the "diamond ring" you see in a real eclipse) and goes out. Then the black sun falls on her and
closes into her halo, a moment of black, and her rim catches fire as before.

**The eclipse taking her** (asked: "the instant transition to the black form is a bit jarring", then "it should be
a gradual change or like a showing of her getting corrupted by the eclipse"). Her light and black looks used to swap
in one frame halfway through the drain. Now:
- black veins edged in ember creep out from her crown (where the blade went in), down her neck and body, along both
  arms and down to her feet, each with a glowing point where it is still spreading;
- every colour of her darkens gradually: armour, skin, hair, wings, halo (its black sun fills in), blade and eyes;
- it comes in surges, one with each heartbeat, and she flinches as each one bites, black smoke and embers
  bursting off her; between beats it creeps, smoking;
- once the last of her colour is gone the veins fade into the black. At her death it runs the other way.

Checked in the preview: both changes run with no errors, the hands are gone and the blade whole after the Fall, and
the black sun is cleared after the Eclipse. A rise-again into either form skips the scenes as before.

Playtest checklist:
- The hands coming in: does it read as her hands becoming the blade? Smooth enough?
- The black sun and the diamond ring: cool, or too long?

## Sol's changes of form shot like a finale; Aurel and Sol kept secret; Kairo the Monk (v2.9p)

Asked: "aurel and sol should be surprises. maybe kairo should also have 'the monk' title or something. make sure
sol's phase changes and fight is epic".

**Surprises.** Until you've met them (beaten them, or seen any of their attacks), Aurel and Sol show as **???** in
the Tally and the Journal, with "You haven't met this one yet." instead of their feats or moves (`G.meta.met`,
`G.meta.hidden`).

**Kairo** is now **Kairo, the Canyon Monk**, "The Monk" for short (on his portal, the Tally, the Journal and the
end screens). He was "the Canyon Fist".

**Sol's phase changes** now use the same camera work as Kairo's awakening: the blow that ends a form holds the
frame, the music stops, the HUD goes, and each scene is cut together from close-ups and wide shots.

- **Noon to the Fall.** Frozen on the hit, the view thrown up on to the sun. Silence; it cracks three times, each
  louder, the view creeping in. It bursts (wide at once) and her hands blow apart into light. She falls as a comet
  with the view riding down with her, time nearly stopping just before she lands; white, then quiet. Close on her
  kneeling in the crater, two heartbeats, then a close-up on her face as her eyes open. She pulls the gnomon out of
  the ridge; the blade's birth is a blast that throws the hero back, and she levels it at you in close-up.
- **The Fall to the Eclipse.** The last blow throws her: frozen on the hit, she flies back in slow motion leaving
  afterimages, lands on one knee and skids, her blade dragging sparks. Silence, close on her face, a heartbeat.
  She stands and drives the blade into her crown; the view slowly backs away as the light pours into her, the
  heartbeat louder each time, until everything is black and still. Then her rim catches fire: a burst of the
  eclipse's corona that throws the hero back, and a close-up as she points the blade.
- **Her death.** Close on her on her knees, closer as her blade breaks, on her face for "Then carry it", then wide
  as she breaks into light and it pours into you.

Checked in the preview: both changes and the death run start to finish with no errors, the HUD comes back after
each, and the view returns to normal. A video of all three was recorded in a headless browser.

Playtest checklist:
- Do the scenes feel big enough? Too long? (about 12 s, 10 s and 10 s)
- Anything that looks wrong in a cut (a close-up off target, the view jumping)?

## A smaller Tally, and plainer Guide text (v2.9o)

Asked: "the tally menu is a bit big so can we make it a list of the bosses and then you can click the boss to see
its tally?" and, about the Guide, "make it less 'ai writing style' and more easy to understand".

- **The Tally** (the feats stone in the camp) now works like the Journal: the bosses and the camp are listed on
  the left, each with how many of its feats are done (2/4), and the one you point at or move to shows its feats on
  the right. The screen is 860 wide instead of 1080 and shows four feats at a time instead of 34.
- **The Guide's text** says plainly what each thing does ("Shows every boss attack you've seen so far", "A
  practice dummy. Hit it to test your moves."). Some page titles changed to match: The camp, Starting a run,
  Between fights, Picking the next boss.

Playtest checklist:
- The Tally: easy to read? Anything you'd want shown on the list itself?
- Read the Guide as someone new would: is anything still unclear?

## The Guide: a picture book of the game (v2.9n)

Asked: "can we maybe add a tutorial screen that has screenshots with arrows to help explain what things are and
their function is? it only opens the first time you play since the patch, and then it becomes part of the esc menu.
i'm imagining it being a like book type style where you click through pages explaining how the hub is, controls, etc."

**The Guide** (`js/guide.js`, pictures in `img/guide/`) is an open book, eleven spreads. On each, the left page has a
screenshot from the game with numbered gold arrows on it, and the right page has one short line per number. The
spreads: what a run is; the Vigil, in three parts (Journal, Tally, sparring post, brazier; Shrine, practice, Hall
of Echoes, Wardrobe; reliquary and gate); the controls (read from your own key bindings, with the pad buttons);
the fight screen in two halves (yours, zoomed in, and the boss's); staggering; the road between trials; the
portals; Sunshards and Motes.

- **Turning pages:** ← → or A / D (or the pad's left and right), a click on the right page or the left, or Back /
  Next under the book. The page lifts and swings over the spine (no animation with reduced motion turned on in
  the system). Esc closes it.
- **When it opens:** by itself the first time you reach the camp after this update (once the title has faded),
  then never again unless you open it. After that it's **Guide** in the pause menu, in the camp, on the road or
  in a fight. Closing it the first time shows the camp's welcome line as before.
- The screenshots were taken from the game itself in a headless browser (HUD and all) and saved as JPEGs, about
  800 KB for all nine.

Checked in the preview: it opens on the first visit and not the second; ← → / A D / clicks turn pages and the
flip plays; Esc from the first-time book returns to the camp, Esc from the pause menu's book returns to the pause
menu; no errors.

Playtest checklist:
- Is every arrow pointing at the right thing? Anything missing that a new player asked you about?
- Is it the right length, or should some spreads go?

## Playtest fixes: the Warden's hands, its corrupted lag, the Shrine, the difficulty (v2.9m)

From a friend's playtest. Asked: "fix the others" (everything in it except the invulnerability chain, which came
from an older build).

- **The Warden's hands take a quarter.** A blow on a hand still breaks the hand at the same rate (its own health
  takes all of it), but only 25% reaches the Warden's health. Before, every part a swing touched counted in full,
  so one swing through a hand and the eye counted twice, or three times through both. The eye is what you fight.
- **A corrupted Warden lags less.** In phases I and II it's now drawn in a box round its eye, hands and shards,
  like the duelling bosses since v2.9j. It still uses the whole screen in phase III (the eye flies all over the
  arena) and during the chain, the Pendulum and the dive. Checked by drawing corrupted Wardens frame by frame
  through three whole fights and looking for any of it on the box's edge: phases I and II came out clean once
  the floor below was included. The box covers about two thirds of the screen, so expect a smaller gain than the
  other bosses got.
- **The Shrine is easier to find.** The camp's welcome now mentions it. Until you've bought something there:
  coming back from a run with enough Sunshards for an upgrade shows "You have N Sunshards. Walk back left to the
  Shrine to spend them.", and the defeat screen adds "Spend Sunshards at the Shrine in camp to grow stronger."
- **The difficulty is always shown** beside the boss's name ("Trial IV · Merciless"), and in the pause menu
  ("Eos's run · Merciless"). Nothing changes it except the brazier.

The bot against the Warden on Standard (all heroes, trials I, IV and VII, 24 fights) went from 25% won to 21%.
It mostly hits whatever is closest, hands included, so a person who goes for the eye should lose less.

Playtest checklist:
- The Warden: does it still feel too easy, or are the hands now a waste of time to hit?
- Corrupted Warden: smoother in phases I and II? Anything cut off at the edges?
- New save: does the Shrine get noticed now?

## Longer stagger bars, much more boss health (v2.9l)

Asked: "i think stagger bars need to be maybe 2x their current amount and maybe bosses get 1.5x hp".

- **Stagger bars are twice as long** for every boss (`G.POISE = 2`, util.js), including how long they can grow
  after each stagger (the cap went from 900 to 1800). Kairo's Gathered Sun bar is a separate thing and is unchanged.
- **Boss health ×1.5** on every difficulty:

| | Gentle | Standard | Merciless |
| --- | --- | --- | --- |
| Boss health | ×0.95 → **×1.425** | ×1.2 → **×1.8** | ×1.25 → **×1.875** |

- A stagger now gives 10 Motes instead of 5, since there are about half as many.
- Fixed a rare crash: if Eos's swing was cleared during her full-sheath draw, the game stopped.

**What the bot saw on Standard** (every boss and hero at trials I, IV and VII, with boons, 168 fights):

| | v2.9j | v2.9l |
| --- | --- | --- |
| Won | 74% | **51%** |
| Hits taken a fight | 3.9 | 6.2 |
| Average win | 104 s | 150 s |

By boss: Leviathan 92%, Mage 88%, Assassin 71%, Knight 42%, Wolf 29%, Warden 25%, Kairo 13%. The Mage's wins
now take 195 s on average.

Playtest checklist:
- Do fights feel weighty, or do they drag? Is two and a half minutes a boss too long?
- Does a stagger feel earned now, and is the window worth the wait?
- Kairo, the Warden and the Wolf: still beatable on Standard?

## Motes, the road merchant and items (v2.9k)

Asked: "i also think we need the run unique currency added if it isnt already?". It wasn't: everything was bought
with Sunshards, which you keep between runs. Now there is a currency that lives and dies with one run.

**Motes** (`js/motes.js`). Shown at the top left beside your two item slots.

| How you earn them | Motes |
| --- | --- |
| Win a trial | 20 + 4 for each trial past the first, ×1.5 for an S, ×1.25 for an A, ×1.1 for a B |
| Win a corrupted trial | twice that |
| Beat the Champion | +25 more |
| Stagger a boss | +10 (you see them fly to you; 5 before v2.9l) |
| The fortune-teller's Motes card | +30 (was 40 Sunshards) |
| The duel's consolation | +40 (was 60 Sunshards) |

No Motes in practice or for beating Sol. When the run ends, by death or by leaving through the gate, what you hold
becomes Sunshards, **one for every five Motes**. The defeat screen says what they became.

**The Road Merchant** sits between the fire and the altars on every road (not after the run is won). His stock is
rolled once a road:

| Row | Price | |
| --- | --- | --- |
| Mending | 60, then 90 | One more health for the rest of the run. Twice a run. |
| Two boons | 75 each | From the boons you could be offered (no Glass Star, corrupted or duo boons). |
| Two items | 35 to 70 | Drawn from the five below. |

Mending was going to heal you, but health refills before every fight, so that would buy nothing. It raises your
maximum instead.

**Items.** Two slots, keys **1** and **2** (rebindable; gamepad: press the left or right stick). You can't buy with
both hands full. A Sun Flask is kept if you're already at full health.

| Item | Price | |
| --- | --- | --- |
| Sun Flask | 45 | Mends 2 health at once. |
| Star Bomb | 40 | A falling star strikes the foe for 80 (more with your damage boons). |
| Slowsand | 35 | The boss and everything it throws move at half speed for 3 s. |
| Ward Charm | 40 | The next blow that would hit you is turned aside. |
| Phoenix Ash | 70 | Held, not used: a killing blow leaves you on 2 health instead. |

**The Fountain and the Smith now take Motes:** cleansing 50, then 100, 200…; tempering 60, then 120, 240….
The Shrine's upgrades are still bought with Sunshards.

Checked in the preview: each item does what it says; buying takes the Motes and marks the row Sold; a full pair of
hands, being too poor and the second mending are refused; Mending raised maximum health from 5 to 7 after two; the
Smith takes Motes and doubles; 47 Motes became 9 Sunshards. A short bot run (Eos against the Knight, the Wolf
and Kairo) gave no errors. The bot doesn't shop, so the numbers above are a first guess.

Playtest checklist:
- Do you have enough Motes to want the merchant each road, or too many? Is a boon worth 75?
- Are the items worth a slot? Is the Star Bomb too weak late or the Phoenix Ash too strong?
- Do keys 1 / 2 feel right, or should items sit on another button?
- Does the merchant look right beside the fire? Is his screen easy to read?

## More boss health, and corrupted fights that run lighter (v2.9j)

Asked: "I think bosses overall could use a bit more hp - and i heard corrupted fights are laggy".

**Boss health, +10% on every difficulty** (`G.DIFFS`, util.js):

| | Gentle | Standard | Merciless |
| --- | --- | --- | --- |
| Boss health | ×0.85 → **×0.95** | ×1.1 → **×1.2** | ×1.15 → **×1.25** |

Every boss, including the Champion and Sol, takes its health from this. The bot on Standard (every boss and hero
at trials I, IV and VII, with boons, 168 fights) went from 79% won to 74%, 3.7 → 3.9 hits taken a fight, and an
average win of 96 → 104 s. **Kairo is now the outlier: the bot won 17% of its fights against him on Standard**
(the Warden is next at 54%).

**Why corrupted fights lagged.** A corrupted boss is drawn as a black shape with a crimson rim, a soft crimson glow
and its eyes burning through (corrupt.js). To do that, every frame it was drawn onto four hidden canvases the size
of the whole screen. Those got recoloured, run through a full-screen colour filter and a full-screen blur, and laid
back over the screen eight more times. That is about sixteen full-screen passes a frame, and more on a big or
high-resolution screen.

What changed:
- **A box round the boss.** The duelling bosses are worked only in a box round them: wide enough for their reach,
  from below the floor to well above their head, plus extra headroom when Kairo raises the Gathered Sun. Bosses
  that draw across the arena keep the full width but not the full height: the Assassin (clones, echoes, threads),
  the Mage (crystals) and the Wolf's pack and wall-run. The Warden, the Leviathan's far coils and Sol still use
  the whole screen.
- **The glow at half size.** The "brightest parts" pass (eyes, rune glows, hit flashes) is worked at half size and
  drawn back up.
- **The soft rim without a blur filter.** It's the crimson shape at a quarter size, stretched back up, which blurs
  it for almost nothing.

How it was checked:
- **Nothing cut off.** Bot fights against every corrupted duelling boss were drawn frame by frame (about 14,000
  frames), looking for any of the boss on the edge of its box. The Knight, Kairo and the Leviathan never touched
  it. The Assassin, the Mage and the Wolf's pack and wall-run did, which is why they get the full width; rechecked
  after.
- **Same look.** Side-by-side screenshots of the corrupted Knight look the same: rim, glow, eye and runes.
- **Speed.** Measured on a 2560-wide screen with the browser drawing in software (the slow case): the corrupted
  drawing went from 164 ms a frame to 59 ms. With the GPU doing the work the numbers were too noisy to compare
  here, but every pass now covers less of the screen, so it should help there too.

Playtest checklist:
- Corrupted fights: smoother? Anything of a boss cut off at the edges (a sword tip, a leap, a clone)?
- Are bosses' longer health bars fun, or a slog? Kairo especially.

## Warnings and rest retuned on Gentle and Standard (v2.9i)

Asked: "warnings .9 and gentle 1.1 / rest .8 standard 1.0 gentle".

| | Gentle | Standard | Merciless |
| --- | --- | --- | --- |
| Your health | 7 | 5 | 4 |
| Boss health | ×0.85 | ×1.1 | ×1.15 |
| Warnings | **×1.1** (was ×1.3) | **×0.9** (was ×0.95) | ×0.8 |
| Rest between attacks | **×1.0** (was ×1.3) | **×0.8** (was ×0.9) | ×0.7 |
| Stagger length | 4.8 s | 4.0 s | 3.2 s |

Merciless is unchanged. Standard now sits one step below it on warnings and rest, and Gentle has normal rest and
slightly longer warnings.

Measured with the bot: every boss and hero at trials I, IV and VII, with boons, 168 fights each.

| | Won | Hits taken a fight | Average win time |
| --- | --- | --- | --- |
| Standard, v2.9g (×1.0 health, warnings and rest) | 80% | 3.1 | 87 s |
| Standard, v2.9h (×0.95 warnings, ×0.9 rest) | 73% | 3.6 | 94 s |
| Standard, now (×0.9, ×0.8) | 79% | 3.7 | 96 s |
| Gentle, before (×1.3, ×1.3) | 89% | 2.3 | 74 s |
| Gentle, now (×1.1, ×1.0) | 90% | 2.5 | 78 s |

The bot reacts to a warning the instant it appears, so shorter warnings and less rest barely move its win rate.
They show up only as slightly more hits taken. For a person they will matter much more, so judge these by playing.
Win rates also drift by about ±4 points from run to run at this size.

Found on the way: on Gentle the bot loses to Kairo two fights in three, mostly to the full Gathered Sun that opens
phase III, the blow that kills outright. It often waits 400–700 px away while the Sun grows and never breaks its
bar. That is the bot not knowing to rush the Sun, not something Gentle does. Nothing was changed for it.

Playtest checklist:
- Gentle: still gentle with normal rest?
- Standard: does it feel a clear step up from Gentle and a clear step below Merciless?

## Kairo's awakening, and a harder Standard (v2.9h)

Asked: "kairo's phase 3 transition needs to be way, way more epic like zoom in, like LEGIT ultra instinct when
goku first unlocked it". That scene works in beats: the hero is swallowed and goes quiet, a pillar of light, and
he comes out calm in a silver aura, his body dodging on its own. Kairo's version is his own, built from those beats.
It runs about 11 seconds, up from about 6½.

| Beat | What happens |
| --- | --- |
| The fall | The hero's last blow of phase II throws him, shot like a finishing blow: the frame freezes on the impact with the view punched in, a flash, shockwave rings and speed lines, and his gold aura shatters into shards. He flies back in slow motion with afterimages left in the air and the view riding with him, craters the ground on his back (rock thrown up, the canyon shaking), bounces and slides to a stop. The music stops. (At first he sank to a knee and toppled a second later; the user found that "awkward", as if he fell over by himself) |
| The silence | The HUD goes, the world goes dark round him, and the view cuts to a close-up of his face and creeps closer. Grit hangs in the air. Two heartbeats |
| The eye | His eye opens white, with a gleam that runs across the whole screen |
| The pillar | The view snaps out wide as a column of white light bursts up through the sky. His strength comes back to 40% inside it, and stones lift off the ridge and hang |
| The reveal | The light thins and he is simply standing there, loose, in a tall silver-blue flame. Three cuts in: his whole height, his chest, his eye |
| The proof | The hanging stones fly at him one after another, and his body slips each one (an afterimage left where the stone was going), feet still |
| The settle | The flame draws in to the thin white aura he fights in, the dark lifts, the HUD and the view come back |

How it's built:
- The camera's push-in can now go further than a third. A scene can cut straight to a framing (`G.fx.cineCut`)
  and choose how fast it eases (`G.fx.cineEase`). Both go back to the defaults once the view is all the way out,
  so the other bosses' push-ins are unchanged.
- Kairo's eye is found in the world while he is drawn, so the close-ups land on it whether he is lying or standing.
- New sounds: a heartbeat, the eye's gleam, the pillar, and a whoosh for each cut.

Checked by stepping through it frame by frame in the preview and through 8 bot fights. Phase III starts as before,
with the Gathered Sun.

**Standard difficulty, a notch up.** Asked: "i also think we need to bump standard difficulty up a bit".

| Standard | Before | Now |
| --- | --- | --- |
| Boss health | ×1.0 | ×1.1 |
| Warnings | ×1.0 | ×0.95 |
| Rest between attacks | ×1.0 | ×0.9 |
| Hero health, stagger length | 5, 4 s | unchanged |

Gentle and Merciless are unchanged. Merciless is still well above (×1.15 health, ×0.8 warnings, ×0.7 rest, 4
health).

Measured with the bot, before and after in the same build: every boss and hero at trials I, IV and VII, with boons
(168 fights each).

| | Before | After |
| --- | --- | --- |
| Won | 80% | 73% |
| Hits taken a fight | 3.1 | 3.6 |
| Trial I / IV / VII | 89 / 82 / 70% | 79 / 77 / 63% |
| Hardest: Warden, Kairo | 58%, 67% | 46%, 42% |

Lune falls the most (67% to 55%), so she is the hero to watch.

Playtest checklist:
- Standard: harder but fair? Do the Warden and Kairo now feel like walls?
- Does the last hit of phase II feel like it is what puts him down?
- Does it feel like a big moment, not just a long one? Is 11 seconds too long by the third run?
- Can you see his face and eye in the close-ups?
- Does the pillar read as light bursting up, not a flash?
- Do the stones he slips read as his body moving on its own?

## A balance pass across bosses, boons and relics (v2.9g)

Asked: "take a look for any other balance changes - deep look", then "Do 1–6" from the list of findings.

**How it was looked at.** About 1,050 fights with the scripted player (`tools/clear-rates.js`):
- every hero against every boss at trials I, III, V and VII, with boons;
- every relic at Awakened against no relic (trial V, no boons);
- the duos and crown sets (trial V);
- Sol at trial VII and the Champion at trials III and V.

The bot is not a human, so the gaps between things matter more than the exact percentages.

**What was off, and what changed.**

| Finding | Change |
| --- | --- |
| The Leviathan won 0 of 48 fights against the bot and landed about 1.6 hits a fight. The Assassin also won none; the Mage won 2 of 48 | Leviathan: health 2900 → 3200, rests between attacks 0.84 / 0.7 / 0.57 → 0.76 / 0.62 / 0.5, warnings ×0.9 → ×0.82. Assassin: phase III rest 0.44 → 0.4. Mage: phase III rest 0.53 → 0.48 |
| The Warden was hardest at trial I (the bot won 50%), almost all of it in phase III, mostly the charge and the meteor wheel | Before trial V only: phase III rests 0.6 → 0.68, the charge's rushes keep their full warning and come 3 at most (not 4), the wheel's meteors fall every 1.8 s (not 1.2) |
| Kairo was a wall at trials V and VII (the bot won 33%), mostly the Risen barrage, the Sunwell Wave and Hailfire | Risen barrage 13–16 shots every 0.15 s → 10–13 every 0.17 s. Hailfire 8–12 every 0.17 s → 7–11 every 0.18 s. The point-blank Wave after a warp waits 0.55 (was 0.45) |
| Glass Star (+35% all damage for 1 health) beat Thorn Crown (+15% for 2) | Glass Star +35% → **+25%** |
| The Offered Hilt did worse than no relic (46% against 57%): its echoes hit for 45% of a blow, once a fight | Echoes hit for **70%** (at least 8), **twice a fight** from the start; Awakened three times (was twice); Ascendant unchanged (every stagger) |
| The weakest duo (Heat Lightning, 78%) and crown set (Ember, 77%), against 91–92% for the best | Embers burn for 1.5 each (was 1) and die down every 2 s (was 1.6); Pyre 16 → 20 per ember. Heat Lightning: bolts set 3 embers (was 2) and hit a burning foe 30% harder |

**After the change**, the same fights again (12 per boss and trial; 64 for the Leviathan):

| Boss | Won before → after | Hits taken a fight | Average win time |
| --- | --- | --- | --- |
| Leviathan | 100% → 98% | 1.6 → 1.6 | 72 → 82 s |
| Assassin | 100% → 92% (trial VII 83%) | 3.0 → 2.5 | 101 → 91 s |
| Mage | 96% → 100% | 2.7 → 2.3 | 110 → 106 s |
| Warden | 63% → 69% (trial I 50% → 67%) | 4.1 → 3.7 | 76 → 69 s |
| Kairo | 56% → 52% (trials V and VII 33% → 42%) | 4.5 → 3.8 | 88 → 95 s |

The Offered Hilt at Awakened: 46% → 63% won (no relic: 57%), win time 130 → 120 s.

With 12 fights per box, the win rates move by up to 14 points either way. The Leviathan's fights got longer, but
the bot still takes under two hits from it, so its attacks themselves are too easy to read. Numbers alone won't fix
that; it needs a harder move or two.

**Left alone:**
- The heroes: Eos 89%, Vesper and Aster 82%, Lune 77%. The spread is modest, and Eos changed in v2.9e.
- Sol: the bot won 0 of 24 at trial VII, most of it lost in the Fall. She needs a human playtest first.
- Trial scaling: the overall win rate barely drops from trial I (89%) to VII (79%).
- Still Hourglass and Quicksilver measured no better than no relic, but both pay on perfect dodges, which the bot
  rarely makes.

Playtest checklist:
- Does the Leviathan still feel like a free trial?
- Is the Warden fair as a first boss, and does it still bite from trial V?
- Kairo at trials V–VII: hard but beatable?
- Is Glass Star still worth a health? Is the Offered Hilt worth taking now?
- An Ember build: do the burns now add up to something you notice?

## Thorn Crown toned down (v2.9f)

Asked: "the 40% dmg increase relic feels busted lol", then "i think start at 15 and build to 40 tbh".

**Why it was.** Thorn Crown was the only relic whose bonus is always on: every other damage relic pays only in a
moment (finishers, a staggered boss, your last health). As it awakened it also grew stronger while its cost
shrank. It went to +50%, then cost only 1 health at Awakened, then +65% with healing at Ascendant.

| Stage | Before | Now |
| --- | --- | --- |
| Base | +40%, 2 less health | **+15%**, 2 less health |
| Kindled (2 wins) | +50% | **+25%** |
| Awakened (4 wins) | costs only 1 health | **+30%** (the cost stays at 2) |
| Ascendant (7 wins) | +65%, and every 25th blow landed without being struck mends 1 | **+40%**, and the same mend |

**Measured** with the scripted player. It can now be handed a relic and its stage (a new `relic` option in
`tools/clear-rates.js`). Trial V, no boons, Vesper and Aster against the Knight, Wolf, Warden, Kairo and Assassin,
40 fights each. With 40 fights the win rates move by about 8 points either way, so the win time is the steadier
number.

| Relic | Won | Average win time |
| --- | --- | --- |
| None | 45% | 128 s |
| Thorn Crown, base, before / now | 58% / 50% | 83 / 101 s |
| Thorn Crown, Awakened, before / now | 78% / 60% | 81 / 96 s |
| Thorn Crown, Ascendant, before / now | 78% / 65% | 68 / 88 s |
| Comet Shard, Awakened | 78% | 86 s |
| Sunstone, Awakened | 70% | 108 s |

It now starts as a small edge and grows into a strong one by the end of a run, without ever losing its cost.

Playtest checklist:
- Is +15% at the start enough to make 2 less health worth it?
- Does any other relic now feel like the one you always pick?

## Eos: the finisher fills the sheath (v2.9e)

Asked: "eos should only need to hit with the 3rd hit of the combo to get a gold stack for his charge".

- A string now puts one in the sheath when its **finisher** (the third cut, 27) lands. The first two cuts no
  longer have to land.
- A string whose finisher misses still puts nothing in, however much of the rest landed.
- Everything else is as v2.9c: two in the sheath and it is full (traced in gold), and the next press is the draw
  for 60, which empties it. A blow turned by Still Point fills it at once.
- The Moves page, his hero-card line and Second Sun's text say "finisher".

On a target that stands still nothing changes (every cut lands). Against a moving boss the sheath fills a little
more often, as a string that opens on the air still counts.

Checked in the preview:
- Two cuts out of reach then a finisher that lands puts one in.
- Two cuts that land then a finisher that misses puts none in.
- Two landed finishers fill the sheath, and the draw hits for 60 and empties it.

Playtest checklist:
- Does filling the sheath feel fair now?
- Does it fill too fast against bosses that move a lot?

## Capes, scarves and hair that hang (v2.9d)

Asked: "the death knights cape should not be spinning around in a circle lol / make sure the animations are all
natural with these new bone structures".

**What was wrong.** The cloth and hair added in v2.5c carry their own speed, so they swing on past a stop and whip
through a turn. Several had nothing keeping them hanging, though:
- **The Knight's cape** was a free swinging chain: about 96% of its speed kept every frame, and only the distance
  between points held it together. A lunge or a turn swung it over the top and round. Measured over a minute of a
  scripted fight, a length of it pointed upward in **48% of frames**, and its tip was above his shoulders in 16%.
- **The heroes' scarves, Lune's hair and Eos's ribbons** turned **4 to 8 full circles in 40 seconds**. Further out,
  each link is pushed to carry on the line of the one before, so once a curl started it carried on round. Falling
  also stood the scarf straight up, so a turn in the air carried it over.
- **The Assassin's scarf** spun twice a minute as its anchor flicked about. **Kairo's hair** spun once.
- **The Assassin's half-cape and sash** (spring joints) could be flung past straight up.

**The fix.** A new shared rule, `D.hang` in `js/draw.js`, used by every chain with speed of its own. A chain has a
way it naturally lies: straight down, or streamed back by the air. Under the rule:
- Its first link may swing only so far either side of that.
- Each link may bend only so far from the one above.
- Nothing may swing more than about 110° to 130° from it.

So cloth can billow, trail and flip as a body turns, but it cannot loop. The rule keeps each link's length and
adds no speed of its own. An early version of it flung the last point of a scarf thousands of pixels for a frame;
that was found by the checks below and fixed before this build.
- **The Knight's cape** has its own version of the rule. It can stream back to a little past level and only a
  little forward, it is damped harder, and its speed is capped.
- **The heroes' tails:** the air can now sweep them from straight down to about 57° above level behind, never
  forward or straight up. A fall lifts a scarf; it does not stand it on end.
- **Kairo's hair** still rises when he powers up: its natural direction follows his drift, which is up then.
- **The Assassin's cape and sash:** their spring joints now have stops (`lo` and `hi`, new options on
  `D.angleChain`).

**Checked.** A watcher finds every chain and spring part on a character and follows it through a scripted fight,
counting segments pointing up, full turns in a second and a half, and links stretched past their length. Every
boss and every hero was run; Sol, the Champion, the Mage, the Warden and the Wolf were already fine.

| Part | Before | Now |
| --- | --- | --- |
| Knight's cape | up in 48% of frames, tip over shoulders 16% | up 0%, no turns (its intro rise from the ground aside) |
| Heroes' scarves and hair | 4 to 8 turns in 40 s | 0 to 1 a minute |
| Assassin's scarf | 2 turns, up 35% | 0 turns |
| Kairo's hair | 1 turn | 0 turns |
| Links stretched | (not measured) | none |

What still counts as a "turn" for Lune and Eos is a jump where they turn round as they fall. The hair or ribbon
flips over the head, then swings back under on landing. Each half is what real cloth would do; the counter adds
the two together.

Playtest checklist:
- Does the Knight's cape look like heavy cloth now: trailing a lunge, swinging past a stop, never looping?
- Do the heroes' scarves and Lune's hair feel natural in jumps, dashes and turns?
- Anything else that moves oddly? Name it and the watcher can be pointed at it.

## Eos: a full sheath is a ready draw; shorter Moves page (v2.9c)

Asked: "after you get the two charges, then you dont need to do the bink bink bink charge, it just works from that
instant ... hitting a right click gives you two charges instantly". Picked from my questions: a full sheath means
"full draw at once", and Still Point fills it by **turning a blow** (pressing it alone does not). Also: "this is also
ridiculous", about the wall of text on the Moves page.

**Eos now:**
- **Filling the sheath.** A string whose three cuts all land puts one in the sheath. Two in it and it is full: the
  three marks light, and it is traced in gold.
- **Drawing.** With the sheath full, the next press is the draw, at once, for **60**. Nothing is held any more:
  the Focus stance and its 18 and 46 draws are gone. The draw empties the sheath.
- **Still Point.** A blow turned by Still Point fills the sheath at once. The 2.5 s "edge" it used to light is
  gone; the sheath stays full until you draw.
- **The draw no longer passes through attacks.** A full sheath kept ready was a dodge kept ready. Wait for a blow,
  press, and he passed through it and countered: the turtling from before, back again. It is now only a cut. Dash
  to get out of the way. (`DRAW_DODGE` in `js/player.js` turns it back on.)
- **Second Sun:** a draw leaves one string in the sheath, so the next needs only one more.
- **Hanging Cut:** works on every draw.

**Why 60 and not 100.** With nothing held for, an instant 100 every two strings was 88 damage a second on a boss
that does not fight back, more than the 84 that started all this. Each big draw also lifts Flow, which raises every
cut after it. Measured over 20 s:

| Draw | Strings to fill | Damage a second |
| --- | --- | --- |
| 100 | 2 | 88 |
| 70 | 2 | 72 |
| 60 | 2 | 67 (chosen) |
| 100 | 3 | 69 |

For comparison, Vesper does 45 and v2.9a's held draw did 57.

**The scripted player** (trial III, no boons, Knight, Wolf, Warden, Kairo and Assassin, 50 fights each):

| Eos build | Won | Hits taken a fight | Win time |
| --- | --- | --- | --- |
| v2.9a (held draw, it dodges) | 62% | 5.2 | 109 s |
| Draw for 60 at once, still dodging | 76% | 3.6 | 88 s |
| **v2.9c: draw for 60 at once, no dodge** | **68%** | **4.4** | **86 s** |
| Vesper, same runs | 54% to 58% | 5.0 | 105 to 107 s |

He is still a little ahead and kills faster. The next lever is the draw's damage (`DRAW_DMG` in `js/player.js`).

**The Moves page is short now.** Every hero's lines were rewritten to a line or two each: the numbers, what the
button does, and the one rule that matters. The full detail stays in this README. The same goes for the Dash,
Mend, Dawnbreak, Crown and Flourish rows and Eos's hero-card lines. Second Sun's and Hanging Cut's text follows
the new rules.

**Checked by hand in the preview:**
- With the sheath empty, a press is a cut (11).
- Two whole strings fill it.
- One press then draws for the full amount at once and empties it.
- A blow turned by Still Point fills it, and the next press draws.
- No errors, and the Moves page fits on one panel.

**Playtest checklist:**
- Does the instant draw feel good at 60, or does it need to hit harder?
- Is it clear when the sheath is full?
- Do you miss the draw being a dodge? If so, `DRAW_DODGE` can come back, and the price would go up (three strings,
  or less damage).
- Is the Moves page short enough now?

## The title in the camp, and the daily trial at the gate (v2.9b)

Asked: "i think the daily trial should not be on the menu and we can change the opening screen to something else
not the boss, but maybe even like, iw ant it to be so that when you click play it transitions into the character in
the hub world seamlessly without flashing to black".

- **The title screen is the camp.** The Warden is gone from behind the menu. You see the Vigil at night: your
  hero stands warming at the fire, with the tent, the sparring post and the eclipse over the ruins. The menu sits
  on the left over a dark band, and the view is drawn in a little closer than in play.
- **Enter the Vigil glides in.** Nothing goes black:
  - The menu fades off over 0.8 s, and the view eases back out to its usual distance.
  - The HUD, the camp's names and the controls line fade in.
  - The hero is yours at once, from where they stood.

  The camp was already running behind the title, so nothing is rebuilt. Quitting to the title from the pause
  menu still fades through black, as it leaves a fight or the road.
- **The daily trial is off the title menu.** It is now on the relic menu at the gate, beside Back. That menu opens
  when you walk into the gate without taking a relic from the reliquary. It shows the day's hero and relic and your
  best of the day, as before.

Checked in the preview:
- The title draws the camp with the hero by the fire.
- Enter the Vigil crossfades: no black frame, the menu fades off, and the HUD and the camp's names fade in.
- The hero walks straight away.
- Quitting to the title and entering again works the same.
- The daily trial shows on the gate's relic menu and is gone from the title.

Playtest checklist:
- Does the first screen feel like the game now, and is the menu easy to read over the camp?
- Is the glide into the camp smooth on your screen, or would a slower or bigger camera move feel better?
- Is the daily trial easy enough to find at the gate?

## Sol, the Falling Sun: the final boss (v2.9a)

Asked: "Looks good, make sure she has a LOT of unique moves (do research) and the fight and transitions feel epic
especially when she comes to fight head on in phase 2", on the brief "Solfall boss brief: Sol, the Falling Sun"
(Claude Doc). Built in `js/sol.js` (about 2,600 lines), with 38 moves. Before building I researched how acclaimed
final bosses are made. The main lessons were:
- One tell always gives the same result.
- Each phase tests a different skill.
- Motifs carry from form to form.
- Transitions happen in the arena.
- The last moment is a single act.

**The run.** A run is now six trials (six of the seven bosses, one left out again), then the seventh portal at the
end of the road opens, pouring white light, and Sol is behind it. Beating her wins the run ("The sun is yours") and
gives 2 more mastery. A boss's trophy is now won at the sixth trial. Falling to her ends the run, except once: the
first time, you **rise again** at the start of the form she felled you in, with everything you carry.

**Noon (12 moves).** She is too big to fit: the sun itself, with no face, in a crown of blades of light, and two
black clawed hands on arms of light that come out of it. Her light burns, and the gnomon's real shadow is safe.
It is worked out from where the sun is, so it swings and stretches as she drifts, and jumping high leaves it. You strike her hands. Breaking both drops
her face to the ridge (strike it for double), and she rises with a ring of light to dash through.

| Move | How it works |
| --- | --- |
| Noonray | Short, or a long drift you walk with |
| Palm Press | An open hand rests; a fist ripples both ways |
| The Meeting | A clap along the floor |
| Finger Rake | Low (jump) or high (stay down) |
| Crown Volley | Count the lit points |
| Sun-Tears | Rolling drops |
| The Kind Hand | Shade under her hand; when the fingers curl, it grabs |
| Pinch | A grab that locks with a flash |
| Finger Drum | Taps across the whole ridge |
| Burning Lens | A hot spot that hunts the shade |
| Swat | Answers a hero who stays in the air |
| Hammer of Noon | Be airborne when it lands |

**The Fall.** Her face cracks, her hands break into light, the sky splits, and she falls as a comet. Then a
white impact and silence. She kneels in the crater at your size. There is a long standoff, she opens her eyes,
and she **pulls the gnomon out of the ridge, and it burns into her blade**: the shade that kept you safe
becomes her sword. Now a shadow on the ridge means something is landing there. She has 16 moves, read from how
she holds the blade:

| Move | How it works |
| --- | --- |
| Meridian | Two or three cuts, by how high the blade is lifted |
| The Verdict | The third cut is read from her pose on the second |
| Horizon | Leaves fire on the floor |
| The Crossing | Comes back if her head turns |
| Falling Sky | Scatter, line or ring, by her blade |
| Glare | A counter stance; your special breaks it |
| Zenith Fall | Her blade sticks: punish it |
| Dayrise | A rising cut |
| Sunhold | A grab |
| Solstice | An advancing spin |
| Afterglow | Her echo cuts a beat later |
| The Returning Noon | A thrown blade: out low, back high |
| The Hours | Wall to wall three times; where she clings is the height |
| Gnomons | Pillars marching out or in |
| Pursuit | Anti-air |
| Flashover | Once, past half: unstoppable, then spent |

The last cut of a string leaves a trail of light hanging that burns for a moment. Her stagger is a knee.

**Eclipse.** She drives the blade into her own crown, and the light drains out of the world over a held note
and a heartbeat. Here **the dark burns**: stay in her light (near her) or in the pools her flares leave. This is
the opposite of Noon, and of the Champion's dark, where your own light was what mattered. Hitting her during a
flare blinds her (her stagger). She has 10 new moves, plus six carried from the Fall that read the same in the
dark:

| Move | How it works |
| --- | --- |
| Umbra Step | Embers walk to where she steps out |
| Corona Ring | Jump it out, jump it back |
| Black Noon | Get into a pool of light |
| Snapshot | Do what the flare showed |
| False Suns | The real rim breathes; false ones burst into light and Starlight |
| Corona Whip | Low or high |
| Drain | Strike her while she drinks |
| Total Eclipse | Dash as the ring closes |
| Sunspots | Seen only in light |
| The Last Light | Her finale, below |

**The Last Light** (below 12%): she rises as a black sun and steps of light come up out of the ridge. Climb
them while the dark rains. At the top your Dawnbreak fills: strike the black sun. If you take too long, her
Duskbreak hits and the steps fall and rise again. When she ends, she kneels, says "Then carry it", breaks into
light that pours into the hero, and dawn comes up for the first time.

She has her own music: one theme that is slow bells at noon, fast drums in the Fall, and near-silence in the
dark, which comes back loud for the last light. She is in the Boss Journal (38 entries).

**Changed from the brief:**
- **The Eclipse.** It burns in the dark around you rather than shrinking your own light circle, because the
  Champion already did that.
- **The finale.** It is a climb, not a beam struggle, because the Champion and Kairo already have those.
- **The retry.** It starts from the form you fell in, as the research warned against replaying a whole finale.

**Checked** in the preview:
- All 38 moves run without errors, and so do every scene, the rise again, the finale, the ending and "The sun
  is yours".
- The road opens the last portal after six wins.
- Screenshots of Noon, the Fall, the Eclipse and the dawn after her.
- The scripted player (`tools/clear-rates.js`, which now knows her shade, her sweeping hands and the climb) won
  4 of 40 fights at trial VII. Half reached the Eclipse. Win times were 78 to 94 seconds of fight.
- She was tuned on those numbers:
  - Health 3,900.
  - Her hands lower.
  - One burn takes one health.
  - Trails only on the last cut of a string.
  - She takes more damage in the dark.

**Art pass** (asked first "sol definitely needs better art work it looks so weird now / it doesnt need a face",
then "She definitely needs to look better": the art style felt too different from the game, and the fallen
form should be "anime celestial"). She is now drawn the way the rest of the game is: flat muted shapes, a thin
line of light at the edges, and glow only at the points that matter.
- **Noon:** the sun has no face (redrawn again after "the sun could look better"). It is a wheel of flat light:
  - Bands from a deep gold edge to a pale heart, a thin dark ring inside the rim (the eclipse to come), and her
    glyph (a ring of twelve hour points and a turning four-pointed star).
  - An hour ring round it, like a sundial's.
  - A double crown of blades of light turning against each other, with slow shafts of light falling from it
    across the sky.
  - When it blazes for Noonray, the disc burns white from the heart out and the crown reaches out. Her hands are black silhouettes with a gold rim and a glyph on the back,
  in the Warden's manner, on thin arms of light. When both hands break, the sun sinks to the ridge: strike it.
- **The Fall:** a celestial knight at the hero's size:
  - Ivory plate (breastplate, shoulders, vambraces, greaves) over a dark bodysuit, edged in gold.
  - A long armoured skirt split at the front, with a sash of light at the waist.
  - Very long dark hair in three strands that stream and wave behind her.
  - Glowing eyes.
  - Her halo is a small copy of the noon sun's wheel: a crown of short blades, an hour ring turning the
    other way, and four points of light.
  - **Wings** of blades of light, the sun's crown made hers (added after "now step up the other form
    models"). At rest they hang folded down her back like a cloak of gold blades. They open into a swept fan
    when she gathers light (the Crossing, Flashover, Corona Ring, Black Noon, Corona Whip) and in the air, so an
    open wing is a tell too.
  - The blade of noon is a dark curved blade with a hot edge.
- **The Eclipse:** all of it turns black with a burning ember rim. A black sun fills her halo, and her wings
  are black blades edged in ember.
- **The Last Light:** the black sun she becomes is the noon sun's dark twin: a crown of black blades edged
  in ember over ember spikes, a black disc with the hours and her star drawn on it in ember.
- **A fix found while checking it:** a move cut short by a stagger or a new phase could leave her stuck. She
  could keep blocking every blow in her Glare stance, stay unstoppable after Flashover, stay hidden, or stay
  without her blade. All of that now clears.

**Not played by hand.** Not done: the sun crown on the echo of a hero who has beaten her (the win is recorded
under `solfall.sol` for it); choosing her in practice; and weapon forms (next, with their own brief).

Playtest checklist:
- Win six trials: does the open last portal feel like a moment?
- Noon: can you find and keep the gnomon's shade, and is breaking her hands worth chasing?
- The Fall: does her landing and the gnomon becoming her blade feel as big as you wanted? Is the duel fair?
- Eclipse: is "stay in her light" readable? Too punishing?
- The Last Light: is the climb a good last act? Does the ending land?
- Is she too hard? The scripted player won 10%, against about 40% for Kairo.
- Does she look like she belongs in the game now: the black hands at Noon, the ivory knight with the halo in
  the Fall?

## Eos's draw: two whole strings to open the sheath (v2.9a)

Asked: "eos might be too strong with the damage block ... my friend is just charging and blocking all the
damage basically", then "you need to do two full left click combos to enable even doing the charge".

**The problem.** Holding the charge never blocked anything. Letting go did: every draw, even the smallest,
carried him through attacks untouched, and a draw was always close. One cut that landed plus a 0.17 s hold
was enough. A draw through a blow was a perfect dodge, which also gave the dash back. So the attack button was a
second dodge that chained with the first. And his string filled all three marks, so a full 100 draw followed
every string almost at once.

**Now:**
- **The sheath opens after two whole strings.** A string counts when all three of its cuts land; one that
  misses a cut does not.
  - Until the sheath is open, holding the button does nothing: no Focus, no slowing down, no draw.
  - Once it is open, holding gathers Focus from nothing as before (0.3, 0.65 and 1.05 s for one, two and
    three marks), and the draw is worth 18, 46 or 100.
  - Any draw empties the sheath again.
  - Being hit loses the Focus in the stance, but not the strings already landed.
- **The string no longer lights marks.** That old head start ("hit, hit and hold starts at two") is gone.
- **Every draw still passes through attacks**, but it is the dash's dodge: it puts the dash on its cooldown,
  and a perfect dodge made by a draw no longer gives the dash back. So the two do not chain.
- **You can see it.** Two small lights at the mouth of the sheath fill with each whole string, with a soft
  chime. When both are lit, a brighter chime and flash, and the sheath is traced in breathing gold until the
  draw.
- **Unchanged:** Still Point, whose turned blow still lights all three marks for a free full draw that does not
  need the sheath or empty it. (It was toned down for a turn by mistake, then put back.)
- **Second Sun** (Eos's boon) still pays off a full draw: hold again within 3 s and the sheath is open at
  once, at two marks.
- A bug found while checking: the sheath's count carried over from one fight to the next. It now starts empty
  every fight.

**Measured:**
- **Damage a second on a boss that does not fight back** (20 s):

| Hero and style | Before | Now |
| --- | --- | --- |
| Eos, string then hold, repeat | 84 | 57 (a full draw about every 4.8 s) |
| Eos, tapping only | 48 | 48 |
| Vesper, tapping | 45 | 45 |
| Aster, tapping | 50 | 50 |

- **The scripted player** (trial III, no boons, Knight, Wolf, Warden, Kairo and Assassin, 50 fights each). It
  now plays whole strings until the sheath is open:

| Hero | Won | Hits taken a fight | Average win time |
| --- | --- | --- | --- |
| Eos before | 78% | 3.5 | 79 s |
| Eos now | 62% | 5.2 | 109 s |
| Vesper (unchanged, three runs) | 54% to 70% | 4.6 to 5.1 | 101 to 104 s |

- **Checked by hand in the preview:**
  - Holding on a fresh fight gathers nothing.
  - Each whole string lights one more; two open it.
  - Then holding reaches three marks and the draw empties it.
  - A string with a missed first cut does not count.

**Playtest checklist:**
- Is two whole strings the right price, or does it feel slow? Lowering `SHEATH_COMBOS` in `js/player.js` to
  1 is the gentler setting.
- Can you see when the sheath is open in the middle of a fight?
- Can your friend still turtle?

## A Boss Journal, a daily trial, and costumes (v2.8a)

Asked, from a list of ten ideas: "2 / 3 / 7 (since its mainly for friends can you make some anime inspired costumes
that change skill effects too?)": the Boss Journal, a daily trial, and hero mastery with costumes.

- **The Boss Journal** (a lectern with an open book in the camp, by the Tally; also **Journal** in the pause
  menu). A page for each boss, an entry for each of its moves. A move not yet met is "? ? ?" with only the phases
  it comes in. Once met: its name, what it does and how to read it, how many times you have met it, how often it
  hit you and how often it felled you. Each tab shows how many of that boss's moves are written down. The text
  is made from the comments over each attack in the boss files, by `tools/build-journal.py`, with
  `tools/journal-extra.json` for the moves that had none (160 moves, all with text). Run it again when a
  boss's attacks change. Practice, god mode and the training dummy write nothing.
- **The daily trial** (title screen: "Daily trial · Lune with the Sunstone · best today: 3 trials"). One run a
  day, the same for everyone that day: the hero and relic are picked from the date, and every pick of the run
  (the first boss, each offering and redraw, the omens, corrupted portals, the road's meetings, banishes, relic
  rewards) is drawn from the day and how many times that kind of pick has come up, so the same choices give the
  same run on any screen. The fights are seeded by the day too. Your difficulty is your own. The day's best
  (trials won, or the run won) is kept. Starting one ends a saved run, and the title says so.
- **Mastery and costumes** (`js/costumes.js`). Winning a trial with a hero gives it 1 mastery, and winning the run
  gives 3 more (the Champion's duel gives 1). The first costume unlocks at 3 and the second at 10. They're put on at
  **the Wardrobe**: your own hero's bay in the Hall of Echoes (it used to be empty). Use it to cycle through
  the costumes and the hero's own colours. A costume changes the hero's colours, adds a head piece, and gives
  their skills their own particles: on swings, hits taken, shots, a shot's trail, dashes and the special. They
  are cosmetic only. The other heroes' echoes in the Hall wear theirs.

  | Hero | Costume | Its effects | Head piece |
  |---|---|---|---|
  | Vesper | Crimson Ronin | falling petals | a headband with trailing tails |
  | Vesper | Starlit Paladin | white feathers | a halo |
  | Aster | Oni Breaker | embers | horns of flame |
  | Aster | Steel Frame | hex plates | a visor |
  | Lune | Shrine Archer | spirit wisps | a fox mask |
  | Lune | Starlight Idol | four-point stars | a ribbon bow |
  | Eos | Thunder Iaido | lightning forks | a crest |
  | Eos | Ink Wanderer | ink drops | a hat's tassel |

  They're anime archetypes, original designs and not copies of any one show's characters. A costume just
  unlocked is named first on the victory screen.

**Checked** in the preview:
- Two daily starts gave the same hero, relic, first boss and offerings; ordinary runs stay random.
- The Journal fills as moves are met and renders each page; it opens from the pause menu.
- All eight costumes and their particles were drawn side by side. The wisps were invisible at first (a
  particle drift read an unset angle) and are fixed.
- The Wardrobe says how far a locked hero has to go, and cycles once a costume unlocks.
- A win at 2 mastery unlocked the Crimson Ronin and said so on the victory screen.
- 28 scripted fights (every boss and hero, 60 seconds each) with costumes worn, and no errors.

**Not played by hand.**

Playtest checklist:
- Fight a boss, then open the Journal: are the moves you saw written down, and does the text help you read them?
- Play today's daily trial with a friend. Do you both get the same first boss and the same offerings?
- Win three trials with a hero and visit the Wardrobe (your own bay in the Hall). Do the costumes look good, and
  do their effects get in the way of reading the fight?
- Is 3 and 10 the right pace for unlocks?

## Lune aims down from the ground (v2.7b)

Asked: "lune should be able to aim down when standing, which it cant aim lower than a straight line in front of
her rn". A shot aimed with the mouse below her shoulder while she stood was flattened to level (a rule for every
hero, so nothing is driven into the floor). Her arrows are now exempt: aimed down, they fly down and burst where
they meet the floor, so a foe low in front of her (a crouching Veil, the Leviathan's head at the shore) can be shot
from where she stands. Specials aimed with the mouse (hers and Vesper's lance) and Eos's draw keep the old rule.

Checked: aimed 29 degrees down from the ground, the arrow flew at 29 degrees and burst on the floor; level shots
unchanged; a still of the bow tipped down.

Playtest checklist:
- Stand as Lune and shoot at something low in front of you: does it go where the cursor is?

## Quality of life: saved runs, quick starts, a recap (v2.7a)

Asked, from a list of quality-of-life ideas: "save run, faster restarts, 5, 6, 7, 10" (boon tooltips in the HUD,
duo previews on offering cards, a run recap on the result screens, remembering the cursor in menus).

- **A run is saved as it goes** (`G.saveRun`, game.js; `R.snapshot`/`R.restore`, run.js; `REST.snap`/`REST.restore`,
  rest.js). On the road it is saved every half second with the road's own state (which plinths are taken, who
  was met, where the hero stands, the Dawnbreak meter); at the start of each fight; and once a fight is won.
  **Continue** on the title picks it up, named with the hero and how far the run has come: back on the road as
  it was, or the fight you were in, from its start. A fall, or walking home from the road, ends the run and
  its save. Practice, the test tools and the Champion's duel are never saved (the road saved before his door
  stands). A shade's duel not yet begun is set up again; one under way is let go.
- **Faster restarts.** R already started again at once, even during the fall, and few knew: as the hero falls,
  a hint now says "R again, with (your relic)". With no run saved, the title offers **Quick start**: the last
  hero and relic, straight into a first trial (the relic must still be unlocked).
- **Boon tooltips.** Every chip under the health (relics, the crown, the duo, each boon) says what it does when
  the pointer rests on it, in a fight too; a corrupted boon's bane is included. (The menu layer used to cover the
  HUD even with no menu open; it now lets the pointer through until a screen is open.)
- **Duo previews.** A set boon's card already said when it woke a duo; with no duo yet it now also says how
  near it brings the nearest one: "Toward the duo Heat Lightning: 2 of 2 Ember, 1 of 2 Storm."
- **The recap.** Under the defeat and victory screens' numbers: this fight's damage by where it came from (Blows,
  Finishers, Special, Set, Embers, Crown, Relic, Flow, Dawnbreak; the top five as bars), and the boss's attack
  that hurt you most. After a fall, and on the screen of the win that completes the run, also the trials won,
  the run's damage, what hurt you most over the run (when it is not this fight's), and the build: relic, crown,
  duo and every boon.
- **Menus remember the cursor**: the title, pause, settings, help, controls, practice, Shrine, feats and moves
  pages open where you left them (the result and choice screens still open on their first item).

**Checked** in the preview: a run started, saved on the road with a plinth taken and the meter at 55, the page
reloaded, and Continue put the hero back on the same spot with the same boons, plinth and meter; a fall cleared
the save and showed the R hint and the recap; a chip's tooltip on hover; Quick start and the remembered cursor on
the title; menu clicks still work; the duo note on cards; 28 scripted fights with no errors and no save written.
**Not played by hand.**

Playtest checklist:
- Take a boon on the road, close the tab, open the game: does Continue put you back as you were?
- Close it mid-fight: Continue starts that fight again. Is that fair, or should it go back to the road?
- Is the recap worth its space on the result screens?
- Rest the pointer on a boon chip mid-fight: useful, or in the way?

## Fixes from an audit, idle moves, and Gentle's warnings (v2.6f)

Asked: "find a list of things that can be fixed", then "do it all"; and partway through: "id liek there to be
idle animations for the player chars, as well as like animations going from an attack back to base standing so
it feels natural".

**Hits that came from empty air** (`tools/hitbox-check.js`: how far from anything drawn a hero can stand and
still be hit). What hits is unchanged except where said; what changed is what is drawn.
- *The Leviathan's Gyre*: its ring of spouts was drawn so faint (to keep a whole shore of them from lighting
  the screen) that it hardly counted as drawn: 261 px. The columns now keep nine tenths of their light and only
  their spray and shake are dimmed: 12 px.
- *Pools* (Kairo's Scorched Wave, Aurel's, the Wolf's and others) burned on their first frame, before any
  flame was drawn. They now start at four tenths of their height, and what burns rises with them. Kairo's: 145 px
  to 8.
- *Sword swings and kicks* cut near the hilt and back to where they started (v2.1b, so nobody can hug a boss)
  but drew only the crescent. The cut now leaves a smear of light over all the slice it cuts, and Kairo's
  punches a cone of air over theirs. The Knight's swings (46-68 px), the Wolf's rake (74) and Kairo's punches and
  kicks (about 40) are all under 15 now.
- *Landings and slams* (`K.crush`) hurt in a box round the impact with only sparks and dust drawn there. A
  brief shock of light now fills it: Kairo's Meteor Heel 48 px to 25, the Knight's slams 22-27 to 16-18.
- *The Star Lance* struck with a square on its head while a streak up to 85 px long trailed behind it. It
  now strikes along the bright part of the streak too, up to 72 px back (hits each foe once, as before).
- Left as they are: the Magus's lightning cuts the whole column its warning marked (v2.1b); the Knight's
  charge and whirl (about 30 px) and the Wolf's Blaze front (35).

**Smaller fixes.** A boon from the fortune-teller's cards that wakes a duo now says so, as one from the
offering does. The final door is now **the Last Portal** (with seven boss portals beside it, the Seventh
was the eighth), on the road and in Aurel's phase III card. The README's opening describes a seven-trial run.
A `.gitignore` keeps `shots/` and loose screenshots out of commits.

**Kairo, a little easier in phase III.** At trials V and VII the scripted player beat him a third of the time,
against 80-100% for every other boss, and lost two of every three of those fights in phase III. He now rises
into it with four tenths of his health (was half), and his openings after a move there are 0.6 of phase I's
(was 0.5). The scripted player, 64 fights a trial: trial III 48%, V 50% (33% before), VII 42% (38%). Still the
hardest boss by a distance.

**Aurel, measured as he is met.** The scripted player fought him with omens and at trial VII's health, which
his duel never has (it is fought clean, and his doorway opens only on the roads after trials II to V). Fought as
met, at trials III-V: 83% over 96 fights; Lune 63% and Vesper 78% over 60 each, and his thrust beats both
most often. That is no Lune problem, so he is unchanged. `CLEAR.start({ champMax: true })` fights him the old
way.

**Looked into, left alone.** `tools/boss-tests.js` loses 23 over its non-Kairo runs, up from 10 at v2.1b: most
of it is the Veil's Echo (made quicker and denser in v2.5b, as asked) and the Magus's bolts (quicker in v2.4d).
The Magus's blink strike flickers on purpose (a lightning flicker that shows where it will drop).

**The scripted player plays to its set a little**: with Gloam it saves its special for the dark mark and
spends it at once when the mark is up; with a jump boon it jumps beside the foe now and then (for Nightglide,
only while the mark is up).

**Gentle's extra warnings** (the plan agreed after v2.5b: Standard and Merciless keep today's warnings, Gentle
adds more). On Gentle only:
- every sword swing, kick and punch that is read from the body draws a soft dashed outline of where it will cut
  during its wind-up, in the light of whoever swings it (not the old red slice), filling as the wind-up runs;
- a soft lane with chevrons along the floor where a body is about to come through: Kairo's Closing Knee, and
  Aurel's thrust and draw (`K.gentleLane`).
Not done yet: the other moves with no area of their own (grabs, other dashes, the Veil's shadows).

**Idle moves.** After about four seconds standing still, and every five to nine after that, each hero does
something of their own, and anything they do cuts it short:
- Vesper lifts her blade to look along it and turns it over;
- Aster lets the maul over the top to stand on its head in front of her and leans on it, then heaves it back
  onto her shoulder;
- Lune raises the bow and tests the string, which twangs as she lets it go;
- Eos thumbs the guard so a hand's width of the blade shows, and clicks it home.

**Back to standing after a blow.** Up and down cuts, and cuts from the air, had no way back: the weapon jumped
to rest in a tenth of a second. Vesper's and Aster's are now carried back from where the cut ended (a third of
a second; the maul heaves over onto the shoulder). The weapon eases to rest a little more softly after any move,
the body comes upright from a blow over more frames, and the weight settles through the knees as a blow
finishes. Vesper's finisher flick runs a touch past where it holds and settles back, instead of stopping dead.

**Checked:** `tools/dodge-tests.js` passes all 136; `tools/boss-tests.js` loses 170 over 496 runs, as before;
the hitbox check on every boss these touched; `tools/motion-check.js` on the heroes (Vesper's finisher and
Lune's shot recovery no longer stop dead; Aster's maul stopping as it meets the floor is meant); stills of the
four idle moves, a Gentle outline and a swing's smear. **Not played by hand.**

**Not built: trading a boon in.** Approved in the plan after v2.5e, but where it happens, how often and what it
costs are open (see the playtest checklist).

Playtest checklist:
- Stand still for a few seconds with each hero. Do the idle moves look natural, and is the timing right?
- Do up cuts, down cuts and air cuts flow back to standing now?
- Do sword swings read better with the smear behind the crescent, or is it too much light?
- Play a fight on Gentle: do the dashed outlines and lanes help without cluttering?
- Kairo at trial V or later: still the hardest, but fair?
- Boon trading: should it trade a boon you hold for a second pick from the offering, once a run, unlocked
  at the Shrine like Banishment? Or something else?

## A redraw and a banish every run (v2.6e)

Asked, after boon rarities were pitched: "i dont think we need rarities but a limited amount of rerolls/banish
could be good. i think base values are a good balance for them". So no rarities: boons keep their numbers.
Every run now has:
- **One redraw** of the whole offering, at the standing stone (Second Thoughts) between the offering and the
  fountain. It used to exist only with the Shrine's upgrade; the stone now always stands, and the Shrine's
  Second Thoughts adds one or two more redraws on top (2 or 3 a run).
- **A banish, once unlocked.** Then: "i think banish should be an unlock to unlock it entirely and not start with
  it". Runs start with none; the Shrine's new **Banishment** (80 Sunshards, then 150 for a second) gives one
  banish a run (two at rank 2). With it, at a plinth, the flourish key (T, Back on a gamepad) strikes that boon
  from the run: it is never offered again, not by the fortune-teller either, and the plinth draws another in its place (a set boon
  for a set boon where one is left). The card shows the key and how many banishes are left. A relic from a
  corrupted portal cannot be banished.

Checked on the road: the card read "E take it · T banish (1 left)"; banishing Nightblade put another Gloam
boon on its plinth and no flourish; a second banish was refused; the banished boon came up in none of 200 later
offerings; the stone redrew the offering and spent the run's redraw.

Playtest checklist:
- Buy Banishment at the Shrine, then on a road stand at a plinth and press T: the plinth shatters grey and a new
  boon stands there. Without it, T at a plinth is only a flourish.
- Is one redraw a run, and 80 Sunshards for the banish, the right amount?

## Kairo's floor crumbles before it falls (v2.6d)

Asked: "can we make it so kairo doesnt break the floor immediately cause it could catch people offguard a bit
more often than it should - make it slowly fall". A slab of the ridge that has taken its third crack used to drop
the instant the hero was off it. Now it crumbles first, for 1.5 seconds, while it still holds: it shakes harder
and harder, its edges split from the floor beside it, it sags between them, its cracks glow and grit pours out of
them, with a rumble as it starts. Then it falls, more slowly than before (1.3 s, was 0.9). The slab under a phase
change crumbles for 1.1 s (the hero is still put off it first) and the Gathered Sun's crater for 1.2 s. It still
never gives way under the hero: if they are standing on it when it is done, it waits until they step off. A
crumbling slab counts towards the two-holes limit and the no-two-side-by-side rule.

Checked: due slab to hole 1.51 s; held for 3 s with the hero standing on it, gone the moment they left; stills of
the crumble and the fall. The scripted player against Kairo at trials III and V (120 fights each way): pit falls
26 to 21, wins 58% to 61% (it reads holes at once, so the warning matters more to a person than to it).

Playtest checklist:
- In Kairo's phase II, watch a slab with three cracks: it shakes, splits at the edges and sags for a moment before
  it drops. Is that long enough to see, and not so long that it loses its threat?

## A Jump slot, and duos (v2.6c)

Asked: "duo boons is cool, maybe add a 5th slot so you can do a 3 boon main and a 2 boon side for a crown + duo
build idea", then "lets get some duo synergy ideas pumped out"; the pitch was approved as it stood.

**The Jump slot.** Set boons now fill five slots: Strike, Special, Dash, Mend and Jump. Five slots allow one crown
(three of a set) and one duo (two each of two sets) at once: three of your main set and two of a side set.

| Set | Jump boon | What it does |
|---|---|---|
| Ember | Cinderfall | landing from a jump scatters cinders: a foe within 200 px catches two embers |
| Storm | Skybreak | a jump in the air sends lightning straight down: a foe below takes 24, and static builds by two |
| Tide | Splashdown | landing from a jump soaks a foe within 200 px |
| Gloam | Nightglide | in the air, the dark mark is spent for triple, not double |

**Duos.** Then: "the duo should just automatically activate in the case of having 2 2 or 2 3 or 2 2 1". A duo is
not taken from the road: it is on while two boons of each of its sets sit in their slots (2 + 2, 3 + 2 or
2 + 2 + 1), and goes quiet again if a swap breaks that. Five slots never hold two duos. A set boon's card says if
it would wake a duo, or put yours to sleep; waking one rings the hero in both sets' colours on the road, and the
active duo is listed in the run panel and the pause menu.

**The offering prefers empty slots.** "offering prefer empty slots and can replace already equipped if choosing
same": a set boon for a slot still empty is four times as likely to be drawn as one for a slot already filled,
which still replaces what is there if you take it (the card says what it replaces).

| Duo | Sets | What it does |
|---|---|---|
| Heat Lightning | Ember + Storm | every bolt sets three embers and hits a burning foe 30% harder; static builds twice as fast on a burning foe (v2.9g: two embers, no extra damage) |
| Scald | Ember + Tide | on a soaked foe, embers burn as steam for double and do not die down |
| Black Flame | Ember + Gloam | spending the dark mark makes every ember burst for 12; they burn on |
| Conductor | Storm + Tide | a bolt on a soaked foe strikes twice; every blow on it builds one static per layer of soak |
| Night Thunder | Storm + Gloam | bolts can spend the dark mark (double); the mark comes back in 2 s, not 4 |
| Abyss | Tide + Gloam | spending the mark on a foe soaked three deep fills a quarter of its stagger bar |

Built in `js/run.js` (the slot, the boons, `G.DUOS`, the offering) and `js/sets.js` (what they do); the hero calls
in on an air jump and on landing. Checked: each duo and Jump boon in a fight (Heat Lightning: static 2 for 1 on a
burning foe and two embers per bolt; Scald: 16 damage in a second against 6, no ember lost; Black Flame: 48 from
four embers; Conductor: two bolts and two static from a blow at two soak; Night Thunder: a bolt spent the mark,
back in 2 s; Abyss: a quarter of the stagger bar; Cinderfall, Splashdown, Skybreak hit and miss by reach;
Nightglide triple in the air); duos on at 2 + 2, 3 + 2 and 2 + 2 + 1, off at 2 + 1 and after a breaking swap, never on the offering; set cards for
empty slots 87% of the time (60% unweighted); a 3 + 2 build holds a crown and a duo; six builds through scripted fights with all four heroes, no errors.

**Seven trials.** "lets add trial 7 since there are 7 bosses": a run is now seven fights, one for each boss
(`G.RUN_FIGHTS` 7), and the final fight, still to come, would be the eighth. The relic's last awakening moves to
after trial VII and the trophy to the boss beaten in trial VII. Aurel's doorway still opens on the roads after
trials II to V. (The dormant final door is still called the Seventh Portal on the road and in Aurel's lines; with
seven boss portals beside it, it may want a new name.)

**Clear rates at trial VII.** Asked: "run tests of all the duos activated a crown + duo level on trial 7 ... and
at max level aurel (full 7 boss version) ... on each character 10 runs each for each boss at trial 7 diff with
omens". `tools/clear-rates.js` has a new option for it, `CLEAR.start({ build: 'duo', awake: 3, trials: [7],
runs: 10, bosses: G.BOSS_IDS.concat(['champion']) })`: each fight gets a crown + duo build (three set boons of
one set and two of another in shuffled slots, turning through all six duos and which set is the crown), a random
relic at Ascendant, trial VII's health, pace and two omens, and Aurel is fought with all seven bosses beaten (his
full seven-stone second phase). 320 fights on Standard, against the same 320 with a normal run's random boons
and the same Ascendant relic:

| Boss | Crown + duo | Random boons |
|---|---|---|
| Warden | 85% | 73% |
| Magus | 100% | 98% |
| Veil | 98% | 98% |
| Knight | 93% | 98% |
| Wolf | 80% | 85% |
| Leviathan | 100% | 95% |
| Kairo | 55% | 38% |
| Aurel (all seven stones) | 75% | 70% |
| All | 86% | 82% |

By hero (crown + duo, random boons): Vesper 88% and 86%, Aster 88% and 79%, Lune 78% and 73%, Eos 90% and 89%.
Aurel by hero (crown + duo): Vesper 90%, Aster 70%, Lune 40%, Eos 100%. Duos: Heat Lightning 81%, Scald 88%,
Black Flame 88%, Conductor 84%, Night Thunder 91%, Abyss 84% (Night Thunder and Abyss over 32 fights, the others
64); wins took 71 to 101 seconds, about as long as with random boons (87 s against 84 s on average). No errors,
no stalemates. Read with care: the scripted player fires crowns but does not play to a set (it does not save a
finisher for the dark mark or jump for Nightglide), each hero-and-boss cell is only ten fights, and Aurel was
fought with omens and trial VII's health, which his duel never has. What it shows: no duo runs away with the game;
Kairo is the wall at trial VII; Lune struggles most against Aurel.

Playtest checklist:
- Take two Ember and two Storm boons in different slots: "Duo: Heat Lightning" as the fourth is taken, and it
  shows in the run panel. Swap one of them for another set: it goes quiet.
- The offering mostly shows set boons for slots you have not filled.
- Try a 3 + 2 build: the crown key works and the duo does its part.
- Skybreak: double jump over the boss and the lightning falls on it. Cinderfall and Splashdown on a landing near it.
- Are any duos too strong (Conductor and Night Thunder can chain a lot of bolts) or not worth building toward?
- A run is seven trials: the last road names trial VII, and the relic's third awakening comes after it.

## The Chalice retuned, and trophies won at trial VI (v2.6b)

**Trophies.** Asked: "if you complete a full run then you get all the trophies, so what im thinking is whichever
boss you beat last before the final boss gives you their trophy as you beat them at their strongest form". A
boss's trophy relic is now won only by beating it as trial VI (the last before the final door, where it is
hardest), so a full run wins one trophy, not six. A first win anywhere still pays its +25 Sunshards. A corrupted
portal never gives one (it is not a trial), and Aurel's Offered Hilt is still won from his duel. A save from
before keeps every trophy it already had. The Shrine's trophy line and the help page say the new rule.
Checked: wins at trials III and V gave none, trial VI gave its boss's, a corrupted rematch at VI gave none.


Asked: "mending restores 3 might be a bit much for chalice", with a new order. Kindled: mending takes a quarter
less time. Awakened: mending takes half the time, and a finished mend bursts into light around the hero (a
medium blast, reaching a foe whose body is within about 240 px of the hero's middle) for 40. Ascendant: the
burst is wider (about 320 px) and hits for 60. Mending still restores 2, as the relic always did; it no longer
goes up to 3. Checked in a fight at every stage: mend times 0.85, 0.64, 0.43 and 0.43 s, 2 health each time,
the burst landing up close and missing past its reach.

Playtest checklist:
- With the Chalice Awakened, mend next to the boss: a quick mend, a ring of light, 40 on the boss.
- Does the burst feel worth standing close for, and is half-time mending too safe?
- Win a run: the victory after trial VI names that boss's trophy; the earlier ones name none.

## Relics that awaken, and five new ones (v2.6a)

Asked: expand relics and boons before the final boss. Of the ideas pitched, this build does the first two: "an
evo at trial 2 completion -> trial 4 completion and a final awakening at the trial before the final boss", and
new relics that change the rules (the "echo of the boss's move" one was left out: "could be strong/difficult to
build"). Duo boons with a fifth slot, boon rarities and pick control (reroll, banish, trade) come next.

**Relic or boon.** A relic is chosen once, at the camp's reliquary, and kept for the whole run (retries
included); first wins over bosses add trophy relics to what the reliquary can offer. A boon is taken on the road
after every victory and lasts only the run. Relics are now the part of a build that grows with the run.

**Awakening.** On the road after trial II, after trial IV and after trial VI, the relic stirs in the fire: it
turns over the flames, the subtitle says so, and the portals wait until it is held to the fire (E at the fire).
It rises out of the flames to the hero and wakes a stage: **Kindled**, **Awakened**, **Ascendant**. Stages build
on each other; every relic held wakes with the run (a second one from a corrupted portal, the Offered Hilt). The
fire's card shows what it does now and the next stage. The pause menu and the run panel name the stage.
Until the final (seventh) fight exists the run ends after trial VI, so Ascendant only shows on the last road.

| Relic | Kindled (after II) | Awakened (after IV) | Ascendant (after VI) |
|---|---|---|---|
| Ember Chalice | mending a quarter quicker | mending takes half the time; a mend bursts around you (about 240 px): 40 | the burst reaches about 320 px and hits for 60 |
| Comet Shard | finishers +75% | a landed finisher calls a comet for 20 | finishers double; comet 45 |
| Twin Moons | Starlight fills 20% faster | a second extra segment | full Starlight: +25% to everything |
| Thorn Crown | +50% | costs one health, not two | +65%; every 25th blow unstruck mends one |
| Wardstone | grows back 20 s after breaking | breaking strikes the foe for 40 | grows back after 10 s |
| Feather Cloak | 18% faster | dashes recover a quarter faster | one more dash in the air |
| Stormcaller | every fourth hit | 45 damage, staggers twice as hard | every third hit; a perfect dodge calls it |
| Phoenix Feather | saving you throws the boss down | twice a run | back on full health, +50% for 8 s |
| Sunstone | stagger fills 55% faster | staggers 2.5 s longer | a break fills a segment and a fifth of Dawnbreak |
| Eclipse Eye | +45% on a staggered boss | +60%, staggers 1 s longer | +80%, Starlight twice as fast on it |
| Magus's Prism | specials +55% | a landed special gives back a quarter segment | +75%, and it strikes again for 30 |
| Silent Shroud | 4 seconds | +70% | the first blow in it is turned aside |
| Unburied Oath | +70% on last health | holds on the last two | double |
| Cinder Pelt | dashes recover 30% faster | dashing through scorches for 18 | twice the Starlight; scorch 36 |
| Drowned Pearl | Starlight +40% | one more health | once a fight, left on last health: mends two |
| Sparring Wraps | the blink's blow +75% | 3 s window, staggers twice as hard | double; the blink gives half a segment |
| The Offered Hilt | echoes last 8 s | twice a fight | every break |

**Five new relics** (in the reliquary from the start), each changing how a fight is played:

| Relic | Base | Kindled | Awakened | Ascendant |
|---|---|---|---|---|
| Still Hourglass | a perfect dodge slows the foe and its attacks to half for 0.6 s | 0.9 s | blows in the slow +40% | 1.2 s; dashes and air jumps back |
| Anvil Heart | blows no longer knock you back or break your attack | a blow taken fills a quarter segment | +40% for 3 s after a blow | a two-health blow takes one |
| Rising Sun | each blow landed +1% to everything, up to 30% a fight; a hit loses it all (an arc at your feet shows it) | up to 45% | a hit costs only half | up to 60%, and it carries between fights |
| Quicksilver | dashes recover twice as fast, each paid with an eighth of a segment (with none, as before) | a perfect dodge gives a quarter segment | one more dash in the air | dashing through the foe cuts for 30 |
| Lantern of Hours | Starlight fills by itself in a fight, a segment every 10 s | every 7 s | every 5 s | full Starlight overflows into Dawnbreak |

Built in `js/relics.js` (everything a relic does, base and awakened, is asked of it by the hero, the bosses and
the road); `js/rest.js` holds the fire's part. Checked: every relic at its base and Ascendant stage through 44
scripted fights with no errors; the on-hit relics (Anvil Heart, Rising Sun, the Pearl, the Phoenix, the
Wardstone, the Shroud, the Oath, the Crown) tested blow by blow; the road walked through at trials II and VI.
Not measured: how much the awakenings move clear rates (the scripted player carries no relic).

**Also in this build.** "The controls at the top of the screen should reflect the mouse/keyboard setting like shift
for dash, left click for attack", then "just make those the first bindings, full keyboard gameplay is
ridiculous": every prompt now shows Left click for attack, Right click for special and Shift for dash (Shift is
dash's first key; J, K, L and the rest still work). The camp's line drops flourish and Esc (both on the Moves
page) so it clears the Starlight panel. And "aster turns the wrong way when charging": while she holds the smash
her facing was locked, so walking or aiming the other way left it coming out behind her. Now she turns with it
while she holds: to the cursor if the smash was clicked, or the way she walks.

Playtest checklist:
- Hold Aster's smash, then move the cursor (or walk) to the other side: she turns, and it lands that way.
- The camp's top line reads Left click attack, Shift dash, Right click special.
- Win trial II: the subtitle says the relic stirs, it turns over the fire, the portals refuse you until you press
  E at the fire, then it rises to you and "KINDLED" shows. The fire's card lists the stage and the next one.
- Pause: the relic shows its stage and what each awakened stage adds.
- Try each new relic once: the Hourglass slow after a perfect dodge, Anvil Heart taking a blow without being
  thrown, the Rising Sun arc filling and emptying, Quicksilver's quick dashes eating Starlight, the Lantern filling.
- Does an awakening feel like a moment, and are any stages too strong or not worth noticing?

## Quick turns and a calmer crest (v2.5e)

Asked: how Hollow Knight turns its enemies ("does it do the silly spin thing this game does or just flip it"),
then "can we try an instant flip on the non heavy enemies", and "the spikes on the leviathans back shouldnt flip
up and down so much".

**Instant turns.** The Magus, the Veil, the Knight, Kairo and Aurel now flip the moment they face the other way,
frame to frame, instead of narrowing through a turn over about a fifth of a second (a `snapTurn: true` on the
boss, read by `K.turn` in `js/bosskit.js`). The Warden keeps the narrowing turn; the Wolf and the Leviathan keep
their own. The heroes are unchanged. `tools/motion-check.js` will now flag these five bosses' turns as one-frame
pops: expected, not a fault.

**The Leviathan's crest.** The spines along its back lie back a little as the body moves fast. The speed they
used was read fresh every frame from points that are themselves on springs, so it jittered, and each spine's
spring was bouncy; now the speed is smoothed, the springs are well damped, and the swing is smaller and rounds
off at its ends. Over the same 20 s of fight they move about a fifth as much per frame and reverse about a third
as often. Standing up and rattling before the coil comes back off the far wall is unchanged.

Playtest checklist:
- Run from one side of each of those five bosses to the other: they face you at once, with nothing squeezing.
- The Knight in particular: if he should feel heavier, he can go back to the old turn (one line in `js/knight.js`).
- The Leviathan's back spines ride the body smoothly, and still stand up and rattle before the coil returns.

## Softer landings (v2.5d)

Asked: "are the animations like natural? do they feel weird now?" Checked with `tools/motion-check.js` against
v2.5b: no boss got worse (Warden 12 to 10 flags, Veil 1 to 0, Knight 4 to 2, Leviathan 5 to 3; Magus 22, Kairo 5
and the Wolf 0 unchanged, the Magus ones being its own blink-in). One thing had got worse: a hero landing dropped
the whole figure about 10 px in one frame and held there (the new hip spring hit a hard limit). Now the drawn
squash eases into a landing over a few frames, as the knees bend, and the hip and chest springs round off at
their limits instead of stopping dead. Drawing only: nothing in the game's timing or hit areas changed.

Playtest checklist:
- Jump and land with each hero, from a short hop and from a full double jump: the body sinks into the knees and
  comes back up, with no one-frame drop.
- Aster's plunge and a heavy blow landing on a hero still read as a hard hit.

## Every character, more frames and a bone for every part; the Hall by the gate (v2.5c)

Asked for: the hero choice nearer the gate, and "the boss animations to be filled with a few more frames and
natural movements to make each move feel distinct from the last ... i still have difficulties figuring out what
kairo is gonna do for his punch combos ... do a full pass for each boss and their animations".

**The Vigil.** The Hall of Echoes now stands between the practice ring and the reliquary, a short walk from the
gate where a run ends (about 1000 px, was about 3100). The camp is a little shorter (3820 px, was 4040) and
re-spaced: the bell, the tally, the fire, the sparring post, the brazier, the Shrine (about 1800 px from the gate,
was 2600), the ring, the Hall, the reliquary, the gate.

**Every boss.** The rule throughout: no timing, hit area, damage or choice of form changed; the new poses fit
inside the time each move already took. A wind-up now plays in stages (a settle or dip, then a build to a peak
that is that move's own), most blows carry on into a follow-through, and the return to rest has its own pose.

- **Kairo's punch combos**, made readable. Each punch winds up in two stages, and the peak is the blow's own: the
  **jab** tucks behind his lead shoulder, chin down; the **cross** rocks his whole body back, the rear fist by his
  ear and the back heel up; the **last punch of a string** sinks low and winds right round, the fist high behind
  his head (a haymaker: the string ends here). The ending tells are bigger: before the **kicks** he turns away
  with the back heel high and an arm up; before the **beam** a glowing hand drops to his hip. Wind-ups are reached
  quicker than relaxed poses, so each stage shows; his step into a punch lands late, as the weight comes forward;
  the rising kick drops onto the front leg first.
- **Aurel:** his sword cuts, thrust, sweep, overhead maul and rising cut coil on to a deeper peak halfway through
  the wind-up; under the charged maul he trembles, more as it fills.
- **The Warden:** the hands and core have a drawn pose on top of where they really are (turn, curl, squash and
  stretch, swell) on springy settles, so they lag, overshoot and settle; a hand swings like a hanging weight and
  stretches along fast motion, fingers curl one after another, and the old per-frame jitter is a smooth tremble.
  Every hand attack has its own hand shape: the slam's upright fist (heavy: swollen and trembling; late: opening
  as it rises), the sweep's cupped scoop, the clap's splayed palms, the flick's pointing finger, the crossfire's
  palms pressed to the walls, the rocket's fist wound against the wall, the comb's raking claws, the cage's
  knuckles turned in, the swat's backhand. The free hands move with the core's attacks, and the core gathers and
  recoils with each of its own.
- **The Magus:** ten spells used to share one raised-staff cast; each now has its own stance (the shards'
  conductor sweep, the rime's floor sweep, the fireball's overhand throw / underhand bowl / two-handed heave, the
  bolts' jabs at the sky, the spheres bounced like a ball, the firewall raked along the floor, the storm stirred
  overhead, the blizzard braced against, the comet cradled then batted), a sprung jolt on release, a sleeve, charm,
  hem and cape that follow late, and a settle that brings the staff down to the hip.
- **The Veil:** blows chain into follow-throughs, it breathes at rest, landings squash. The flurry's tempo tell is
  in the body now: the measured string stands tall with the blade raised behind its head; the quick one hunches,
  fists by its face, bouncing in time. The feint rocks back where the lunge drops into a sprinter's set; the
  stance's low and high forms are told further apart; the snare is two-handed (no longer the crescent's wind-up).
- **The Knight:** a settle, then a build to the deepest pose, held; a follow-through after most blows; the off
  hand springs on and off the hilt; the strain is a smooth tremor. The stamp is visible now (the back knee lifts,
  the foot slams); the charge levels the blade like a ram, pawing; the whirl coils with the blade level behind;
  the overhead strides with the blade straight up, rises onto the lock and sinks into the blow.
- **The Cinder Wolf, overhauled** (the user: "the wolf in general really felt kinda roboticy"). It was drawn as one
  rigid piece: a straight bar of a neck with the head locked to it, stick legs that never bent at the wrist, a
  plank of a back, and a tail on a fixed sway. Now, drawing only (no hit area moves): a **neck** with a crest that
  arches up from the withers and a throat that falls to the chest; a **head carried on a spring**, so it is thrown
  back as the body drives off, carries on as it stops, dips as it lands and nods against the stride; a **tail of
  springs**, stiff at the root and loose at the tip, that whips through every start, stop, turn and landing;
  **legs with muscle** (the shoulder slung from the withers, a heavy thigh) whose **wrists fold and hocks flex**
  as a paw comes up, the paw curling under; a **back that flexes**, bowing up as it gathers or lands and
  stretching as it drives, and a chest that heaves with its breath.
- **The Cinder Wolf** (the first pass): a real trot (the back dips with each footfall, the head nods late, the tail swings against
  the stride), leaps through push-off, stretch, tuck, fall and reach, and landings forepaws first. The short pounce
  goes low and flat; the long one sits back on its haunches, chest up, tail lashing. The breath and the cinders no
  longer share a wind-up; the prowl's rump wiggle is its own; the harry is a bull's stance.
- **The Leviathan:** a pose table of its own (it had none): the head pulls back, rears, tips and rolls on springs,
  the neck winds into an S and the coils follow a beat late. The low lunge gathers into a flat tight S, the high
  one rears like a swan; the snap holds a raised S that sways; the high jet stands a rigid column; the breaker
  draws back like a bow.

**A bone for every part** (the user, after the wolf's overhaul: "can we do this sort of build for every character
and boss, give each piece its own bone/part"). Every hero and boss now has a rig drawn over its pose, built the
way the wolf's was, on shared spring helpers in `js/draw.js` (`D.rig`, `D.angleChain`): each piece on its own
spring, so it lags, swings past and settles instead of moving with the body as one piece; joints that bend
(feet that roll off the toe and fold as they lift, spines that bow and stretch, heads that ride their necks);
everything that hangs on a chain pushed by the body's starts, stops and landings; and breath and a shifting
weight at rest. **Drawing only:** for every character the old and new files were run side by side on fixed
seeds and compared frame by frame (hit boxes, hazards, timings, health): identical.
- **The heroes:** hips that sink through the knees on a landing or a blow and come back up past rest; the chest
  riding the hips a beat late; the head on its own spring and tilt; feet that roll, fold and strike heel first;
  the weapon at rest swinging on the hand (never during a blow, so it still lines up with the cut); coat tails,
  cloaks, tabards, sashes, Vesper's hood point, Lune's quiver and moon, Eos's hat, sleeves and sheath, Aster's
  pauldrons each on their own spring; scarves, capes, hair and ribbons as weighted chains. (Fixed on the way:
  the front leg was drawn shifted down by the run's bob and Eos's crouch, sinking her front foot into the floor.)
- **The Warden:** each finger a chain of joints (curling knuckle first, splaying, trailing, thrown by a stop);
  a wrist of void under each palm bending on its own, with two wisps; the core's glow, corona, rim and eye each
  lagging the disc; the lid opening wider and settling but never shutting past what it tells (the lance count
  stays crisp); the corona's flames leaning from its motion.
- **The Magus:** torso, head, the hat bending at two joints with its charm hanging plumb on a cord, each arm and a
  fist turned with the staff, the staff head lagging the hands, a three-link sleeve, a two-joint hem, an
  eight-joint cape, motes trailing their orbits.
- **The Veil:** hips, chest, spine, head and a loose hood point; each upper arm and hand; each blade lagging the
  hand through a fast cut and swinging past; feet that point and roll; the cape, sash and scarf as chains (the
  shadows each have their own springs).
- **The Knight:** a torso that leans and bows, a helm that lags and nods, each pauldron on its own spring, and
  **clanks**: when a swing stops hard, it lands, a foot strikes or it is struck, the plates drop and ring back,
  the blade shivers and the tabard and cape ripple; the greatsword lagging the hands and swinging past after a
  heavy blow; the tabard's tatters and the cape as weighted chains.
- **The Leviathan:** a jaw on its own hinge spring; a lure, a frill on three rays and two barbels as chains; each
  of the thirty segments of neck and coils its own spring, so what the head does runs down the body a beat late
  and swings past; the crest spines; a tail that whips between its root and its fluke; weed and water trailing.
- **Kairo:** a head that jolts and snaps back; shoulders that twist with the fists (adding to the wind-up tells,
  not blurring them); hips that dip; fists that overshoot and recoil; bare feet that roll onto the ball, point in
  the air and grip on landing; trousers that billow; hair and sash with real momentum. His corrupted **Shadow
  Partner** used to stay frozen in one pose and never visibly punch: it now throws each blow half a second after
  him, when its hit comes.
- **Aurel:** chest, hips, shoulders and head on springs; a short hood point; the weapon in hand on its own spring
  (the maul heavy and slow, the sword quick); each racked weapon jostling and rattling on its own spring (its glow,
  the tell, unchanged, and a small start as it lights); boots that point and pivot on the toe; the cloak's tails
  thrown about by his motion.

**Two small hit-what-you-see changes** came with it: the Magus's body box follows its drawn lift and sink (up to
about 12 px), and the spot on the Leviathan's head where your blows land follows its drawn pose (up to about
50 px in a wind-up). Say if either should be kept where it was.

**Checked:** each boss's agent ran every attack and form in all three phases with no errors, and compared hazards
frame by frame against the old file (the Knight, the Wolf and the Leviathan: identical); I looked at a strip of
one move of each boss, and at Kairo's five wind-up peaks and Aurel's side by side. The scripted player over every
boss at roads III and V (224 fights): no errors; the Warden 75-84%, the Magus 100%, the Veil 91%, the Knight
92-100%, the Wolf 91% (89% of 80 after its overhaul), the Leviathan 100%, Kairo 55-60% (as before). After every character's rig, again
(224 fights, every boss with every hero at roads III and V, then 64 of Aurel): no errors; the Warden 84%, the
Magus 100%, the Veil 97%, the Knight 97%, the Wolf 94%, the Leviathan 100%, Kairo 53%, Aurel 73%; by hero Aster
89%, Vesper 88%, Lune 84%, Eos 96%. I looked at one move of each on film and at the heroes' contact sheet.
**Not played by hand.**

**Playtest checklist**
- Does the wolf still feel robotic anywhere? (Its walk, its turn, its landings, its tail.)
- Does anyone now move too loosely (floppy, rubbery) or too much? The Leviathan's coils, the Magus's cape, the
  heroes' ribbons (they can hook at the tip as a run starts) and the Warden's fingers moved most.
- Can you now tell Kairo's jab, cross and last punch apart, and which ending is coming?
- Does any boss look stiff, floaty or too wobbly now? (The Warden's hands and the Leviathan's neck changed most.)
- Is the Hall of Echoes where you want it?

## Cleaner blows, a quicker Echo, a truer throw (v2.5b)

Asked for: a ring that turns gold when to press in the Black Dawn (then: "the gold ring can stay for every
situation"); the two newest bosses' animations "much more clean", then a coolness and smoothness pass on Aurel's; the Veil's shadow-summoning move faster, with more of them in quick succession;
and the Knight's sword-throw warning to cover only where the sword goes.

- **The Black Dawn's ring.** On every difficulty the ring that closes on the meeting point turns **gold for
  exactly the press window** (0.18 s either side on Gentle, 0.14 on Standard, 0.1 when fierce) and holds gold
  on the meeting ring until it shuts.
- **Kairo's punches come from his fist.** They used to borrow a sword's crescent, drawn 45-100 px out in front
  of a fist that reaches about 45: the blow seemed to hang in the air ahead of him. Now a punch is a drive of
  air from the knuckles out to its reach, with rings thrown ahead of it, and the warning glint sits on the fist
  as it is drawn back (so you can see which hand). His fists and kicks also start moving a few frames before
  the hit, so the limb and the drawn blow arrive together. What a punch hits is unchanged.
- **Aurel, tidied.** The weapons on his back are dark shapes until they light (they were in full colour all
  the time: the maul's head read as a green box); the glow is still the tell, and a feint's half glow still
  shows half the colour. His sword now starts down with the drawn cut instead of after it. He stands a little
  taller, and his walk's hips ride highest as the legs pass (it was the wrong way round, which bounced him).
- **Aurel, smoother and cooler** (a second pass): his weapon leaves a **trail** through a fast blow (a short
  ribbon in its hero's light, only while it moves); the **maul** is bigger in his hand and its head dark, with
  only its striking face lit (it was outlined like a sign), outlined only as it charges; the **leap back
  before the bow** starts with a dip and, when it is a long one, is a **tucked back flip** with afterimages
  (his cloak turns with him); the **rising cut** carries him up off the floor with the blade and drops him
  back down. Same timings, apart from the 0.06 s dip before the leap back.
- **Both: firmer springs.** Their poses snapped into a blow on an underdamped spring that swung about 8% past
  and back; it is firmer now (a blow lands and holds).
- **The Veil's Echo:** five shadows in phase I (was three), seven in II (was four, two out of the air), nine in
  III (two cuts, a pair, one from the air, a cut, a pair, one from the air, then the Veil itself), each on the
  heels of the last (gaps 0.5/0.4/0.36 of a beat, were 0.85/0.62/0.58), a little quicker to set (0.44, was
  0.5), quicker across (1550 px/s, was 1300) and quicker to fade. Up to three or four are out at once.
- **The Knight's Hurl:** the floor lane now runs from the sword's edge as it leaves his hand to the wall it
  sticks in, and on the call from the wall back to him; it used to cover the whole floor, behind him too.

**Checked:** frame strips of Kairo's combo, Aurel's sword string, maul, bow, rising cut and the Knight's
throw; Aurel again after the second pass, 96 fights at roads II-V: 78% (80% in v2.5a), no errors; the Echo in all three
phases; the scripted player on the Veil, Kairo, the Knight and Aurel at roads III and V (128 fights): the Veil
97%, the Knight 84%, Aurel 69%, Kairo 47%. Kairo checked again against v2.5a's own file, 64 fights each: 61%
before, 58% after (the same, within the noise: what a punch hits did not change). One error in the first run
(a Kairo fight, "cannot set 't' of null") did not come back in 104 more Kairo fights; the bot now keeps stack
traces so it can be found if it does. **Not played by hand yet.**

**Playtest checklist**
- Do Kairo's punches read better as coming from his fist? Can you tell jab from cross by the glint?
- Is Aurel's rack easier to read now the unlit weapons are dark?
- Is the Echo too much in phase III (nine shadows)? Too little in phase I?

## The Champion Who Came Before (v2.5a)

Asked for: the rival from the final-boss ideas, as an optional event fight rather than the run's ending ("let's
do 1 as an event fight chance"), built from the Claude Doc "Solfall boss brief: The Champion Who Came Before",
made epic, with **phase II changing with the bosses you have beaten that run**. He is `js/champion.js`, with his
own arena, sounds and music.

**Where he is.** On the road before trials III to VI, about one road in five, once a run, a rock stands where
the road's meeting would be (it takes that place), split by a crack of dawn light. **Aurel, the First Light**
sits inside it. Walk up and press the interact key to step through, or walk on: the doorway does not come back
this run. Win or lose, you come back out onto the same road, with the offering as you left it. Losing costs
nothing: no Sunshards lost, and not even the Dawnbreak meter you spent in there ("He helps you up").
There are no omens in his fight.

| Phase | What he does | The tells |
|---|---|---|
| I · The Duel | A mirror match. Four weapons ride on his back, twins of the heroes' own, and he fights with one at a time: the **sword** string (a falling cut, a rising cut, then the finisher, or a dash-thrust if you backed off), the **maul** (a sweep, then a smash; held longer it throws a wave along the floor), the **bow** (he leaps back, then a fan or one piercing shot down a line that follows you), the **sheathed blade** (one to three marks, then he draws through you). A **guard**, and once a phase a **mend** | **Whichever weapon glows on his back is what comes next.** The finisher: his shoulders drop with a breath out (a beat later from his third string on). The thrust: the point drawn back, a glint. The draw: count the marks on the sheath (three crosses half the arena), then a glint at its mouth as his hand closes on the hilt. The guard: all four dark and he stands still; a blow on his front is turned into a counter-cut (from behind it lands). The mend: he kneels and light gathers; hit him and he is thrown open |
| II · The Trophies | He plants his sword and holds a hand to the **standing stones** behind him, one for every boss. **Those you beat this run wake one by one**, each its own way (the Warden's sun ring, the Magus's ice, the Veil's moon, the Knight's sword, the Wolf's moon and howl, the Leviathan's wave, Kairo's flame), and send a thread of light into his rack. Then the cloth burns off his twin of **your** weapon. He fights with **one move borrowed from each boss you beat**, and phase II opens with the move of the last one. His weapons switch mid-combo, and he **feints** | A stone flares, with that boss's bell, before its move. Feint: two glows at once, the brighter is real. A switch: the rack lights again mid-string |
| III · The Other Side | The sky over the broken arch cracks; the black behind it pours into him; he roars, a blade in each hand. **The arena goes dark** but for your own light (it grows with your Starlight), the lit stones, his eyes and the glows on his rack; lightning shows him now and then. The **Four-Fold** string (every weapon in one combo). Below 12%, once: the **Black Dawn** | In the dark, read the rack. Below a quarter he stops guarding |

**The borrowed moves:** the Warden's two hands of light close on you (be over them, or out from between them);
the Magus's arrow loosed straight up, and the sky answers it where you stand, three times; the Veil's shades of
him step out of the air around you and cut through one after another (each pulses and rings just before it
goes); the Knight's sword hurled along the floor into the wall, then called home; the Wolf's pounce, the ground
burning either side where he lands; the Leviathan's spouts where you run; Kairo's beam, which tracks and then holds.

**The Black Dawn** is a beam clash won on the beat. He leaps to the far side with every weapon alight and lets
the black go; your light holds it where it reaches you. Three flashes run down the beam: **press attack as each
meets the light** (a ring closes on the meeting point; the key is shown over it). Only the first press for each
flash counts, so mashing loses. Two of three and his beam breaks, and so does he; fewer and it goes through you
(2 health, 3 when fierce). A full Dawnbreak meter takes the first flash by itself.

**He does not die.** At nothing he goes down on one knee, the black runs off him and out of the sky, the dawn
comes back, and he puts his hood down, smiles, and holds his weapon out to you hilt first. Then he is gone.

**Stagger** (*OPEN*): his weapon is knocked out of his hand and sticks in the floor, and he goes after it (not
past you). Blows deal 1.5x; disarmed he takes a little more. Longest in the duel, shortest in the dark. Blows on
his back build it faster; a clash with his swing fills a fifth of it.

**Reward:** Sunshards (60 the first time, 30 after, on top of the usual pay), and **his trophy relic, The Offered
Hilt**, held for the rest of the run and offered in later runs: once a fight, when you break a boss's stagger,
for 6 seconds every attack also throws an echo of another hero's weapon in that hero's light. **Feat:** Read the
rack: beat him without being caught by a feint.

**His music:** the camp's own chords (Dm Bb F C) on bells, slow, in the duel; drums and a horn with the
trophies; in the dark the chords turn (Dm Bb Gm A) and a snare drives it; only a drone and a heartbeat in the
clash.

**Open questions from the brief, as built** (say if any should change): his name is Aurel; a doorway rather than
a person on the road; one meeting a run, no rematch; the clash is on the beat with a key shown; the relic is the
Offered Hilt; "your own special turned on you" became the cloth burning off his twin of your weapon; whether what
corrupted him is the final boss is left open (phase III's card says only "What the seventh door keeps"). There
are **seven** stones, one for every boss, not six.

**Checked** (scripted, not played): every move runs without errors; the phase scenes, the dark, the clash, the
ending, the win screen, the doorway on the road and both ways back were checked as still frames and by script
(a lost duel puts back the Dawnbreak meter and closes the doorway). The scripted player (`tools/clear-rates.js`,
now taught his set-up glints, the guard, the borrowed hands and shades, and to press the clash on the beat with
a person's error) **wins 80%** of 128 duels at roads II-V on Standard (Eos 91, Vesper 84, Aster 75, Lune 69).
Its first pass found the dash-thrust unfair (its warning was 0.3 s; 24 of 31 losses): it now winds up for
about half a second with a glint and chases less far in the duel, and the draw got its own glint. **Nobody has
played him yet**, and his music has not been heard.

**Playtest checklist**
- Does the rack read? Can you tell which weapon is coming, and do the feints feel fair once you know the brighter glow is real?
- Does the thrust at the end of the string feel dodgeable now? Does the draw's glint give you enough time?
- Phase II with two, three, four, five stones: is the scene too long with many (it speeds up), and do the borrowed moves read as those bosses?
- Phase III: is it too dark? Is your light big enough with no Starlight?
- The Black Dawn: is the beat clear from the flash and the ring alone? Is the window (0.14 s either side on Standard) too tight?
- One road in five, once a run: too rare, too common?
- The ending: does it land? Is the Offered Hilt worth having?

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
| III · Still Sky | He falls as if beaten and rises with four tenths of his health back (half before v2.6f), the phase marks gone from his bar, in a thin white aura. The **Gathered Sun** opens it. Standing still between attacks he slips blows to his front and answers with a palm. Empty Hand, the Sweeping Wave, Meteor Heel. Below 12%, once: the **Last Wave** | Empty Hand: eyes shut, nothing moving; strike him and he is behind you. Sweeping Wave: which hand is on top as he draws back says which way it sweeps (the lead hand: up) |

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
| Glass Star | Risk | all damage +25% (v2.9g: was +35%), one less health | 1 |

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
