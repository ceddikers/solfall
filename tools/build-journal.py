# Solfall - builds js/journal-data.js, the text of the Boss Journal (ui.js), from the bosses' own code.
# Each boss's attacks are read from its ATTACKS table; each attack's entry is the comment written above the
# function that runs it (with version notes in brackets taken out), and its name is the one that comment
# opens with ("Closing Knee (a hero keeping away): ..." -> "Closing Knee"), or the attack's id made readable.
# An attack with no comment and no defeat-screen tip naming it takes its entry from tools/journal-extra.json.
# Run it again whenever a boss's attacks or their comments change:   python tools/build-journal.py
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = {'warden': 'boss.js', 'mage': 'mage.js', 'assassin': 'assassin.js', 'knight': 'knight.js', 'wolf': 'wolf.js',
         'leviathan': 'leviathan.js', 'kairo': 'kairo.js', 'champion': 'champion.js', 'sol': 'sol.js'}
SKIP = {'reckoning', 'answer', 'antiair'}  # (a boss's Reckoning is its own moment, named on the screen when it comes)


def attacks_table(src):
    m = re.search(r'ATTACKS = (?:B\.ATTACKS = )?\{', src)
    if not m:
        return []
    i, depth = m.end(), 1
    while depth and i < len(src):
        depth += {'{': 1, '}': -1}.get(src[i], 0)
        i += 1
    body = re.sub(r'//[^\n]*', '', src[m.end():i - 1])
    out = []
    for part in re.split(r',(?![^()]*\))', body):
        part = part.strip()
        if not part:
            continue
        if ':' not in part:
            out.append((part, part))
            continue
        key, val = part.split(':', 1)
        fn = re.search(r'\b(atk\w+)', val)
        out.append((key.strip(), fn.group(1) if fn else None))
    return out


def comment_above(src, fn):
    m = re.search(r'\n([ \t]*)(?:function\*?|const)\s+' + re.escape(fn) + r'\b', src)
    if not m:
        return ''
    lines = src[:m.start() + 1].split('\n')[:-1]
    got = []
    while lines and lines[-1].strip().startswith('//'):
        line = lines.pop().strip()[2:].strip()
        if '-----' in line:
            break  # (a section's divider: what is above it belongs to something else)
        got.insert(0, line)
    return ' '.join(got)


def tips_of(src):
    m = re.search(r'tips: \[(.*?)\],\s*\n', src, re.S)
    return re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1)) if m else []


def clean(text):
    text = re.sub(r'\((?:[^()]|\([^()]*\))*\bv\d+\.\d+[a-z]?\b(?:[^()]|\([^()]*\))*\)', '', text)  # version notes
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'\s+([.,;:])', r'\1', text)
    # sentences about the code (o.then, B.something) are for programmers, not players
    text = ' '.join(s for s in re.split(r'(?<=[.!?])\s+', text) if not re.search(r'\b[a-zA-Z]+\.[a-z][a-zA-Z]*\b', s))
    return text


def name_of(atk, text):
    m = re.match(r"(?:The )?([A-Z][\w' -]{2,32}?)(?: \([^)]*\))?: ", text)
    if m and m.group(1) in ('Ice', 'Fire', 'Lightning', 'Void'):
        text, m = text[m.end():], None  # (an element's label, not a name)
    if m and not m.group(1).startswith('Phase') and len(m.group(1).split()) <= 3:
        return m.group(1).strip(), text[m.end():]
    words = re.sub(r'\d+$', '', atk)
    words = re.sub(r'([A-Z])', r' \1', words).strip()
    return words[:1].upper() + words[1:], text


# entries written by hand for attacks with no comment or tip to make them from (tools/journal-extra.json)
EXTRA_PATH = os.path.join(ROOT, 'tools', 'journal-extra.json')
EXTRA = json.load(open(EXTRA_PATH, encoding='utf-8')) if os.path.exists(EXTRA_PATH) else {}

data = {}
for boss, f in FILES.items():
    src = open(os.path.join(ROOT, 'js', f), encoding='utf-8').read()
    entries = {}
    tips = [t.replace("\\'", "'") for t in tips_of(src)]
    for atk, fn in attacks_table(src):
        if atk in SKIP or atk.startswith('t_'):
            continue
        text = clean(comment_above(src, fn)) if fn else ''
        name, body = name_of(atk, text)
        if not body:
            # no comment over it: the boss's defeat-screen tips that name it, if any do
            key = re.sub(r'\d+$', '', atk).lower()
            hit = [t for t in tips if re.search(r'\b' + re.escape(key), t.lower()) or re.search(r'\b' + re.escape(name.lower()), t.lower())]
            body = ' '.join(hit[:2])
        if not body and atk in EXTRA.get(boss, {}):
            name, body = EXTRA[boss][atk].get('name') or name, EXTRA[boss][atk].get('text', '')
        body = body[:1].upper() + body[1:] if body else ''
        if len(body) > 420:
            cut = body[:420].rfind('. ')
            body = body[:cut + 1] if cut > 120 else body[:420].rstrip() + '...'
        entries[atk] = {'name': name, 'text': body}
    data[boss] = entries

out = ('// Solfall - the Boss Journal\'s text (ui.js), made by tools/build-journal.py from the comments over each\n'
       '// boss attack. Do not edit by hand: change the comment and run the tool again.\n'
       "'use strict';\nG.JOURNAL = " + json.dumps(data, indent=1, ensure_ascii=False) + ';\n')
open(os.path.join(ROOT, 'js', 'journal-data.js'), 'w', encoding='utf-8', newline='\n').write(out)
print(sum(len(v) for v in data.values()), 'attacks;', sum(1 for v in data.values() for e in v.values() if not e['text']), 'without text')
