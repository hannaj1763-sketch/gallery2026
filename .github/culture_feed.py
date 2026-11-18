# 문화포털 '한눈에보는문화정보' 오픈 API → 전시 소식 파일(culture/exhibits.json) 만들기
# GitHub Actions 에서 매일 실행돼요. 인증키는 저장소 Settings > Secrets 의 CULTURE_API_KEY.
# 출처: 한국문화정보원 문화포털 (공공데이터포털, 이용허락범위 제한 없음)
import os, sys, json, datetime, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

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
TRIES = [('realm2', {'realmCode': 'D000'}), ('realm', {'realmCode': 'D000'}),
         ('period2', {}), ('period', {})]
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
    })

exhibits.sort(key=lambda e: (e['end'] or '9999', e['title']))
if not exhibits:
    # 새로 받은 게 없으면 예전 파일을 지우지 않고 그대로 둬요
    sys.exit('전시 정보를 하나도 받지 못했어요. 위 로그(code/msg)를 확인해 주세요.')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'updated': datetime.datetime.now().isoformat(timespec='minutes'),
           'source': '한국문화정보원 문화포털 (공공데이터포털)', 'count': len(exhibits), 'items': exhibits},
          open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'저장: {OUT} ({len(exhibits)}건)')
