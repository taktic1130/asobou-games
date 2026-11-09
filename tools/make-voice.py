# こえの ファイルを VOICEVOX（ずんだもん）で つくる
# じゅんび: VOICEVOX を きどうしておく（http://127.0.0.1:50021 が うごいている こと）
# つかいかた:
#   python tools/voice-phrases.py        … ことばの いちらんを つくる
#   python tools/make-voice.py           … ない ファイルだけ つくる
#   python tools/make-voice.py --all     … ぜんぶ つくりなおす
import json, pathlib, subprocess, sys, tempfile, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE = ROOT / 'voice'
ENGINE = 'http://127.0.0.1:50021'
SPEAKER = 3          # ずんだもん（ノーマル）
SPEED, PITCH, INTONATION = 0.95, 0.03, 1.2


def post(path, params, body=None):
    url = f'{ENGINE}{path}?{urllib.parse.urlencode(params)}'
    data = json.dumps(body).encode('utf-8') if body is not None else b''
    req = urllib.request.Request(url, data=data, method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    redo = '--all' in sys.argv
    items = json.loads((VOICE / 'phrases.json').read_text(encoding='utf-8'))
    todo = [i for i in items if redo or not (VOICE / f"{i['id']}.mp3").exists()]
    if not todo:
        print('nothing to do'); return
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='asobou-zunda-'))
    for k, it in enumerate(todo, 1):
        q = json.loads(post('/audio_query', {'text': it['text'], 'speaker': SPEAKER}))
        q.update(speedScale=SPEED, pitchScale=PITCH, intonationScale=INTONATION, prePhonemeLength=0.05, postPhonemeLength=0.1)
        (tmp / f"{it['id']}.wav").write_bytes(post('/synthesis', {'speaker': SPEAKER}, q))
        if k % 20 == 0:
            print(f'{k}/{len(todo)}', flush=True)
    subprocess.run(['powershell', '-ExecutionPolicy', 'Bypass', '-File', str(ROOT / 'tools' / 'wav2mp3.ps1'),
                    '-In', str(tmp), '-Out', str(VOICE)], check=True)
    for f in tmp.glob('*.wav'):
        f.unlink()
    tmp.rmdir()
    print('done', len(todo))
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'voice-phrases.py')], check=True)


if __name__ == '__main__':
    main()
