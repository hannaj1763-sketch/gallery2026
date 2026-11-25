# 공공데이터포털 '전국초중등교과주제별학습자료' 를 받아 data/learn.json 으로 저장해요.
# 인증키는 GitHub Secrets 의 DATA_GO_KR_KEY 에서만 읽어요 (코드에 적지 않아요).
import json, os, re, sys, time, urllib.parse, urllib.request

KEY = os.environ.get('DATA_GO_KR_KEY', '').strip()
OUT = os.environ.get('OUT', 'data/learn.json')
API = 'https://api.data.go.kr/openapi/tn_pubr_public_lern_data_api'
SUBJECTS = ['국어', '수학', '사회', '과학', '영어', '도덕', '음악', '미술', '체육', '실과', '통합', '역사', '지리', '정보', '기술', '가정', '한국사', '세계지리', '한국지리', '물리', '화학', '생명과학', '지구과학', '윤리']

def get(page, rows):
    q = urllib.parse.urlencode({'pageNo': page, 'numOfRows': rows, 'type': 'json'})
    # 인증키는 이미 인코딩된 형태일 수도 있어서 그대로 붙여요
    url = f'{API}?serviceKey={KEY}&{q}'
    for i in range(3):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            print('다시 시도', i + 1, type(e).__name__)
            time.sleep(3)
    raise SystemExit('API 응답을 받지 못했어요')

def items_of(js):
    body = (js.get('response') or {}).get('body') or {}
    head = (js.get('response') or {}).get('header') or {}
    if head.get('resultCode') not in (None, '00', '0', 0):
        raise SystemExit('API 오류: ' + str(head))
    it = body.get('items')
    if isinstance(it, dict): it = it.get('item', [])
    if isinstance(it, dict): it = [it]
    return it or [], int(body.get('totalCount') or 0)

def pick(item, names, test=None):
    for n in names:
        if item.get(n): return str(item[n]).strip()
    if test:
        for v in item.values():
            if isinstance(v, str) and test(v): return v.strip()
    return ''

def grade_subject(kw):
    text = ' '.join(kw)
    grades, subs = set(), set()
    for m in re.finditer(r'초(?:등학교)?\s*(\d)\s*(?:학년)?\s*([가-힣]+)?', text):
        grades.add('초' + m.group(1))
        if m.group(2):
            for s in SUBJECTS:
                if m.group(2).startswith(s): subs.add(s)
    if re.search(r'중학교|중\d', text): grades.add('중')
    if re.search(r'고등학교|고\d', text): grades.add('고')
    for s in SUBJECTS:
        if re.search(r'(초등학교|초\d|중학교|고등학교)[^;]*?' + s, text): subs.add(s)
    return sorted(grades), sorted(subs)

def normalize(raw):
    out = []
    for it in raw:
        title = pick(it, ['lrnDataNm', 'lernDataNm', 'learnDataNm', 'lrnMtrlNm', 'dataNm', '학습자료명'])
        kws = pick(it, ['kwrdNm', 'keywordNm', 'kwrd', '키워드명'], lambda v: v.count(';') >= 2)
        url = pick(it, ['hmpgAddr', 'homepageUrl', 'hmpgUrl', '홈페이지주소'], lambda v: v.startswith('http'))
        date = pick(it, ['referenceDate', 'dataStdrDe', '데이터기준일자'])
        if not title or not url: continue
        kw = [k.strip() for k in kws.split(';') if k.strip()]
        g, s = grade_subject(kw)
        topic = []
        for k in kw:
            if re.search(r'초등학교|초\d|중학교|중\d|고등학교|고\d|학년', k) or k in topic: continue
            topic.append(k)
        topic = topic[:6]
        out.append({'t': title, 'k': topic, 'g': g, 's': s, 'u': url})
    return out, date

def main():
    if not KEY: raise SystemExit('DATA_GO_KR_KEY 가 없어요 (Settings > Secrets 에 넣어 주세요)')
    rows = 1000
    first, total = items_of(get(1, rows))
    raw = list(first)
    pages = (total + rows - 1) // rows if total else 1
    for p in range(2, pages + 1):
        raw += items_of(get(p, rows))[0]
    if raw: print('첫 항목 이름들:', sorted(raw[0].keys()))
    data, date = normalize(raw)
    if len(data) < 100:
        raise SystemExit(f'받은 자료가 너무 적어요({len(data)}개). 기존 파일은 그대로 둘게요.')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'updated': date or time.strftime('%Y-%m-%d'), 'count': len(data), 'items': data}, f, ensure_ascii=False, separators=(',', ':'))
    print('저장 완료:', len(data), '개')

if __name__ == '__main__':
    main()
