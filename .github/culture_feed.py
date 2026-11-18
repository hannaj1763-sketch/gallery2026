# 문화포털 '한눈에보는문화정보' 오픈 API → 전시 소식 파일(culture/exhibits.json) 만들기
# GitHub Actions 에서 매일 실행돼요. 인증키는 저장소 Settings > Secrets 의 CULTURE_API_KEY.
# 출처: 한국문화정보원 문화포털 (공공데이터포털, 이용허락범위 제한 없음)
import os, sys, json, datetime, urllib.parse, urllib.request, urllib.error
import xml.etree.ElementTree as ET, re, html as htmllib

KEY = os.environ.get('CULTURE_API_KEY', '').strip()
OUT = os.environ.get('OUT', 'culture/exhibits.json')
BASE = 'https://apis.data.go.kr/B553457/cultureinfo'
if not KEY:
    sys.exit('CULTURE_API_KEY 가 없어요 (저장소 Settings > Secrets and variables > Actions 에 등록해 주세요)')

today = datetime.date.today()
FROM, TO = today.strftime('%Y%m%d'), (today + datetime.timedelta(days=90)).strftime('%Y%m%d')

def call(path, **params):
    # 인증키는 이미 인코딩된 키/일반 키 둘 다 받아 줌
    key = KEY if '%' in KEY else urllib.parse.quote(KEY, safe='')
    q = '&'.join(f'{k}={urllib.parse.quote(str(v))}' for k, v in params.items())
    url = f'{BASE}/{path}?serviceKey={key}&{q}'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'AGJJ-feed'}), timeout=30) as r:
        return r.read().decode('utf-8', 'replace')

def items_of(xml_text):
    root = ET.fromstring(xml_text)
    code = (root.findtext('.//resultCode') or '').strip()
    msg = (root.findtext('.//resultMsg') or '').strip()
    total = root.findtext('.//totalCount')
    out = []
    for it in root.iter('item'):
        out.append({c.tag: (c.text or '').strip() for c in it})
    return code, msg, int(total) if total and total.isdigit() else None, out

def pick(d, *names):
    low = {k.lower(): v for k, v in d.items()}
    for n in names:
        v = low.get(n.lower())
        if v: return v
    return ''

def fmt(d):
    d = (d or '').replace('.', '').replace('-', '')
    return f'{d[:4]}-{d[4:6]}-{d[6:8]}' if len(d) >= 8 else d

# 분야별(전시 = D000) 목록을 먼저, 안 되면 기간별 목록에서 '전시'만 골라요
TRIES = [('realm2', {'realmCode': 'D000'}), ('period2', {})]   # 주소 확인됨: realm2·period2
raw = []
for path, extra in TRIES:
    try:
        page, got = 1, []
        while page <= 10:
            text = call(path, PageNo=page, numOfrows=100, **{'from': FROM, 'to': TO}, **extra)
            code, msg, total, items = items_of(text)
            print(f'[{path}] page {page}: code={code} msg={msg} total={total} items={len(items)}')
            if page == 1 and items: print('  필드 예시:', sorted(items[0].keys()))
            got += items
            if not items or (total is not None and len(got) >= total): break
            page += 1
        if got:
            raw = got; print(f'→ {path} 사용, {len(got)}건'); break
    except urllib.error.HTTPError as e:
        body = ''
        try: body = e.read().decode('utf-8', 'replace')[:400].replace('\n', ' ')
        except Exception: pass
        print(f'[{path}] 실패: HTTP {e.code} {e.reason} | 답: {body}')
    except Exception as e:
        print(f'[{path}] 실패: {e}')

exhibits, seen = [], set()
for it in raw:
    realm = pick(it, 'realmName', 'realmname', 'realm')
    if realm and '전시' not in realm and '미술' not in realm: continue
    seq = pick(it, 'seq')
    title = pick(it, 'title')
    if not title or seq in seen: continue
    seen.add(seq)
    end = fmt(pick(it, 'endDate', 'enddate'))
    if end and end < today.isoformat(): continue
    exhibits.append({
        'seq': seq, 'title': title,
        'start': fmt(pick(it, 'startDate', 'startdate')), 'end': end,
        'place': pick(it, 'place', 'placeName'), 'area': pick(it, 'area', 'sido'),
        'sigungu': pick(it, 'sigungu'),
        'thumb': pick(it, 'thumbnail', 'imgUrl', 'imgurl'),
        'realm': realm or '전시',
        'gpsX': pick(it, 'gpsX', 'gpsx'), 'gpsY': pick(it, 'gpsY', 'gpsy'),
        'url': pick(it, 'url', 'placeUrl'),
        **({'price': pick(it, 'price')} if pick(it, 'price') else {}),
    })

# ----- 상세 정보(작가·전시 소개)로 검색이 잘 되게 -----
# 상세 조회는 하루 호출 수가 정해져 있어서, 예전에 받아 둔 설명은 다시 쓰고 새 전시만 받아요.
old = {}
try:
    for e in json.load(open(OUT, encoding='utf-8')).get('items', []):
        if e.get('desc') is not None and 'price' in e: old[e['seq']] = (e['desc'], e['price'])
except Exception: pass
SKIP = {'seq', 'title', 'startdate', 'enddate', 'place', 'area', 'sido', 'sigungu', 'thumbnail', 'imgurl', 'gpsx', 'gpsy',
        'realmname', 'realmcode', 'servicename', 'price', 'phone', 'url', 'placeurl', 'placeseq', 'serviceTp'.lower()}
def detail_text(seq):
    for path in ('detail2', 'detail'):
        try:
            code, msg, total, items = items_of(call(path, seq=seq, PageNo=1, numOfrows=1))
            if not items: continue
            it = items[0]
            parts = []
            for k, v in it.items():
                if k.lower() in SKIP or not v or v.startswith('http'): continue
                t = re.sub(r'<[^>]+>', ' ', htmllib.unescape(v))
                t = re.sub(r'\s+', ' ', t).strip()
                if len(t) >= 2: parts.append(t)
            price = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', htmllib.unescape(pick(it, 'price', 'charge', 'fee')))).strip()[:120]
            return ' '.join(parts)[:700], price
        except Exception as e:
            last = e
    return None
budget = int(os.environ.get('DETAIL_MAX', '400'))
got_new = 0
for e in exhibits:
    if e['seq'] in old: e['desc'], e['price'] = old[e['seq']]; continue
    if budget <= 0: continue
    budget -= 1
    d = detail_text(e['seq'])
    if d is not None: e['desc'], e['price'] = d; got_new += 1
print(f'상세 설명: 새로 {got_new}건, 예전 것 재사용 {sum(1 for e in exhibits if e["seq"] in old)}건')
if got_new == 0 and not old: print('  (상세 조회가 안 되면 제목·장소로만 검색돼요)')

# ----- 🍽 전시장 근처 음식점 (한국관광공사_국문 관광정보 서비스) -----
# 같은 장소는 한 번만 묻고, 예전에 받아 둔 건 7일 동안 다시 써요. 안 되면 그냥 건너뛰어요.
def tour_call(op, **params):
    key = KEY if '%' in KEY else urllib.parse.quote(KEY, safe='')
    base = dict(MobileOS='ETC', MobileApp='AGJJ', _type='json')
    base.update(params)
    q = '&'.join(f'{k}={urllib.parse.quote(str(v))}' for k, v in base.items())
    url = f'https://apis.data.go.kr/B551011/{op}?serviceKey={key}&{q}'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'AGJJ-feed'}), timeout=30) as r:
        t = r.read().decode('utf-8', 'replace')
    try: d = json.loads(t)
    except Exception: raise RuntimeError('JSON 아님: ' + t[:200])
    body = d.get('response', {}).get('body', {})
    items = body.get('items') or {}
    items = items.get('item', []) if isinstance(items, dict) else []
    return items if isinstance(items, list) else [items]
old_food = {}
try:
    for e in json.load(open(OUT, encoding='utf-8')).get('items', []):
        if 'food' in e: old_food[e['seq']] = (e['food'], e.get('foodAt', ''))
except Exception: pass
food_ok, food_cache, food_new, food_fail = None, {}, 0, ''
week_ago = (today - datetime.timedelta(days=7)).isoformat()
for e in exhibits:
    if e['seq'] in old_food and old_food[e['seq']][1] >= week_ago:
        e['food'], e['foodAt'] = old_food[e['seq']]; continue
    if food_ok is False or not e.get('gpsX') or not e.get('gpsY'): continue
    k = (round(float(e['gpsX']), 4), round(float(e['gpsY']), 4))
    if k not in food_cache:
        got = None
        for op in ('KorService2/locationBasedList2', 'KorService1/locationBasedList1'):
            try:
                got = tour_call(op, numOfRows=12, pageNo=1, mapX=e['gpsX'], mapY=e['gpsY'], radius=1000, contentTypeId=39, arrange='E')
                break
            except urllib.error.HTTPError as er:
                try: food_fail = f'{op}: HTTP {er.code} ' + er.read().decode('utf-8', 'replace')[:200].replace(chr(10), ' ')
                except Exception: food_fail = f'{op}: HTTP {er.code}'
            except Exception as er:
                food_fail = f'{op}: {er}'
        if got is None:
            food_ok = False; print('🍽 근처 음식점을 받지 못했어요 →', food_fail); continue
        food_ok = True
        food_cache[k] = [{'name': f.get('title', ''), 'addr': f.get('addr1', ''), 'img': f.get('firstimage2') or f.get('firstimage', ''),
                          'dist': f.get('dist', ''), 'tel': f.get('tel', ''), 'x': f.get('mapx', ''), 'y': f.get('mapy', ''),
                          'cat': f.get('cat3') or f.get('lclsSystm3') or f.get('lclsSystm2') or ''}   # 분류 코드 (카페·전통찻집 구분용)
                         for f in got if f.get('title')][:12]
        food_new += 1
    e['food'], e['foodAt'] = food_cache[k], today.isoformat()
print(f'🍽 근처 음식점: 새로 받은 장소 {food_new}곳' + ('' if food_ok is not False else ' (실패 — 위 메시지 확인)'))

exhibits.sort(key=lambda e: (e['end'] or '9999', e['title']))
if not exhibits:
    # 새로 받은 게 없으면 예전 파일을 지우지 않고 그대로 둬요
    sys.exit('전시 정보를 하나도 받지 못했어요. 위 로그(code/msg)를 확인해 주세요.')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'updated': datetime.datetime.now().isoformat(timespec='minutes'),
           'source': '한국문화정보원 문화포털 (공공데이터포털)', 'count': len(exhibits), 'items': exhibits},
          open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'저장: {OUT} ({len(exhibits)}건)')
