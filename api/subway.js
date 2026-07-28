// /api/subway.js
const SEOUL_API_KEY = process.env.SEOUL_SUBWAY_API_KEY;

const STATIONS = [
  '개화', '김포공항', '공항시장', '신방화', '마곡나루', '양천향교', '가양', '증미', '등촌',
  '염창', '신목동', '선유도', '당산', '국회의사당', '여의도', '샛강', '노량진', '노들',
  '흑석', '동작', '구반포', '신반포', '고속터미널', '사평', '신논현', '언주', '선정릉',
  '삼성중앙', '봉은사', '종합운동장', '삼전', '석촌고분', '석촌', '송파나루', '한성백제',
  '올림픽공원', '둔촌오륜', '중앙보훈병원'
];

const AVG_SEGMENT_SEC = 120;

function nowEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

function parseRecptnDt(str) {
  if (!str) return null;
  const t = new Date(str.replace(' ', 'T') + '+09:00').getTime();
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

async function fetchStation(stationName) {
  const url = `http://swopenapi.seoul.go.kr/api/subway/${SEOUL_API_KEY}/json/realtimeStationArrival/0/20/${encodeURIComponent(stationName)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NineLineDashboard/1.0)' }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { list: data.realtimeArrivalList || [] };
  } catch (e) {
    clearTimeout(timer);
    return { list: [] };
  }
}

function isLine9(row) {
  const tag = `${row.subwayId || ''} ${row.trainLineNm || ''}`;
  return tag.includes('9호선') || row.subwayId === '1009' || row.subwayId === '1092';
}

module.exports = async (req, res) => {
  if (!SEOUL_API_KEY) {
    res.status(200).json({ trains: [], error: 'SEOUL_SUBWAY_API_KEY 환경변수가 설정되지 않았습니다.' });
    return;
  }

  const nowSec = nowEpochSeconds();
  const settled = await Promise.allSettled(STATIONS.map(fetchStation));
  const perTrain = new Map();

  settled.forEach((r, idx) => {
    if (r.status !== 'fulfilled') return;
    const list = r.value.list || [];
    const rows = list.filter(isLine9);

    rows.forEach(row => {
      // 열차 번호 정규화 (문자열 변환 및 공백 제거)
      const rawTrainNo = row.btrainNo || row.trainNo;
      if (!rawTrainNo) return;
      const trainNo = String(rawTrainNo).trim();

      const eta = parseInt(row.barvlDt, 10);
      if (Number.isNaN(eta)) return;

      const recTime = parseRecptnDt(row.recptnDt);
      const lag = recTime ? Math.max(0, nowSec - recTime) : 0;
      const effEta = Math.max(0, eta - lag);

      const existing = perTrain.get(trainNo);
      if (!existing || effEta < existing.effEta) {
        perTrain.set(trainNo, {
          trainNo,
          stationIdx: idx,
          dir: row.updnLine === '상행' ? 'up' : 'down',
          express: (row.btrainSttus || '').includes('급행') || (row.trainLineNm || '').includes('급행'),
          effEta
        });
      }
    });
  });

  const trains = [];
  perTrain.forEach(t => {
    const frac = Math.max(0, Math.min(1, t.effEta / AVG_SEGMENT_SEC));
    const pos = t.dir === 'up' ? t.stationIdx - frac : t.stationIdx + frac;
    trains.push({
      id: t.trainNo,
      num: t.trainNo,
      dir: t.dir,
      pos: Math.max(0, Math.min(STATIONS.length - 1, pos)),
      express: t.express,
      etaToNextStationSec: t.effEta
    });
  });

  res.status(200).json({ trains });
};
