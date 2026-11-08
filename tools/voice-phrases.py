# ゲームで よみあげる ことばを ぜんぶ あつめて voice/phrases.json と voice/list.js を つくる
# つかいかた: python tools/voice-phrases.py
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
JP = re.compile(r"[ぁ-んァ-ヶー一-龯]")


def vid(text):
    """common.js の voiceId と おなじ（FNV-1a 32bit、UTF-16）"""
    h = 0x811C9DC5
    b = text.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 16777619) & 0xFFFFFFFF
    return '%08x' % h


def src(name):
    return (ROOT / name).read_text(encoding='utf-8')


def strs(s):
    return re.findall(r"'([^'\n]*)'", s)


def const_list(text, name):
    m = re.search(r"const %s = \[(.*?)\];" % name, text, re.S)
    return strs(m.group(1)) if m else []


phrases = []


def add(t):
    t = t.strip() if t.strip() == t else t
    if t and JP.search(t) or t == 'HAPPY BIRTHDAY':
        if t not in phrases:
            phrases.append(t)


# 1) say( … ) の なかの もじれつ（かけらは のぞく）
for f in sorted(ROOT.glob('*.html')) + [ROOT / 'common.js']:
    s = f.read_text(encoding='utf-8')
    for line in s.splitlines():
        if 'say(' in line or 'Say(' in line or "say: '" in line:
            for t in strs(line):
                if t and not t[0] in ' 、' and not t.endswith(' ') and JP.search(t)                         and not any(ord(ch) > 0xFFFF for ch in t) and not t.startswith('りょう'):
                    add(t)

common = src('common.js')
for t in const_list(common, 'PRAISE'):
    add(t)
add('シール ゲット！')

# 2) くみあわせで できる ことば
shin = src('shinkansen.html')
for st in const_list(shin, 'STATIONS'):
    add(f'{st} えき、 {st} えき です')
    add(f'つぎは {st} えき です')
for v in re.findall(r"(\w+): '([^']+)'", re.search(r"const SHAPE_NAMES = \{(.*?)\};", shin).group(1)):
    add(v[1] + ' かたち')
for st in const_list(src('senro.html'), 'STNAMES'):
    add(f'{st} えき！')
for n in re.findall(r"name: '([^']+)', ing:", src('cooking.html')):
    add(f'{n}、 ください！')
fumi = src('fumikiri.html')
for n in re.findall(r"sp: [.\d]+, name: '([^']+)'", fumi):
    add(f'{n} が きます')
for i in range(1, 21):
    add(f'{i}りょう だったね！')
animals = re.findall(r"'(.)': '([^']+)'", re.search(r"const ANIMAL_NAME = \{(.*?)\};", common, re.S).group(1))
cake = src('cake.html')
for _, n in animals:
    add(f'{n}さん、 おたんじょうび おめでとう！')
    add(f'きょうは {n}さんの おたんじょうび！ ケーキを つくろう！')
    add(f'{n}さん')
for t in const_list(cake, 'NUM'):
    add(t)
m = re.search(r"const msgs = \[(.*?)\];", cake)
for t in strs(m.group(1)):
    add(t)
for n in range(1, 49):
    add(f'シールが {n}まい あるよ！')

items = [{'id': vid(t), 'text': t} for t in phrases]
out = ROOT / 'voice'
out.mkdir(exist_ok=True)
(out / 'phrases.json').write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding='utf-8')
(out / 'list.js').write_text('window.ASOBOU_VOICE = new Set(%s);\n' % json.dumps([i['id'] for i in items]), encoding='utf-8')
print(len(items), 'phrases')
