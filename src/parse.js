// Shared parsing utilities for itinerary input: CSV/TSV/Excel parsing,
// currency detection, date parsing, and smart column mapping.
// Centralized here so TripForm (paste) and ImportExcelButton (file/paste)
// reuse the exact same logic.
import * as XLSX from 'xlsx'

const MONTHS_EN = {
  jan: 0, feb: 1, mar: 2, apr: 3, mac: 3, may: 4, Mei: 4, mei: 4, jun: 5,
  Jul: 6, jul: 6, ogos: 7, ogo: 7, Aug: 7, aug: 7, sep: 8, Sep: 8,
  okt: 9, Okt: 9, oct: 9, nov: 10, Nov: 10, dis: 11, Dis: 11, dec: 11,
}

export function detectCurrency(text) {
  const map = [
    { re: /RM\s?(\d+(?:[.,]\d+)?)/i, code: 'MYR' },
    { re: /¥\s?(\d+(?:[.,]\d+)?)/, code: 'CNY' },
    { re: /\$\s?(\d+(?:[.,]\d+)?)/, code: 'USD' },
    { re: /€\s?(\d+(?:[.,]\d+)?)/, code: 'EUR' },
    { re: /£\s?(\d+(?:[.,]\d+)?)/, code: 'GBP' },
    { re: /₩\s?(\d+(?:[.,]\d+)?)/, code: 'KRW' },
    { re: /￥\s?(\d+(?:[.,]\d+)?)/, code: 'JPY' },
  ]
  for (const m of map) {
    const mm = text.match(m.re)
    if (mm) {
      return {
        currency: m.code,
        amount: Number(mm[1].replace(',', '.')),
        clean: text.replace(m.re, ''),
      }
    }
  }
  return { currency: null, amount: null, clean: text }
}

export function diffDays(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0
  return Math.round((db - da) / 86400000)
}

// Build a local YYYY-MM-DD string WITHOUT timezone shift (unlike toISOString).
function isoDate(y, mo, d) {
  const mm = String(mo + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

// Parses a date token into an ISO YYYY-MM-DD string. Supports:
//  - 2026-08-20
//  - 20/8/2026 or 8/20/2026 (guesses day/month order, year optional -> trip year)
//  - 20 Aug 2026 / Aug 20 2026 / 20 Ogos 2026 (Malay months included)
//  - 8月20日 (Chinese)
// Returns null when no date found.
export function parseDateToken(text, fallbackYear) {
  const year = fallbackYear || new Date().getFullYear()
  // ISO
  let m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (!Number.isNaN(d.getTime())) return isoDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  // Chinese 8月20日 / 8月20
  m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  if (m) {
    const mo = Number(m[1]) - 1
    const d = Number(m[2])
    return isoDate(year, mo, d)
  }
  // English month name
  m = text.match(/\b([A-Za-z]{3,9})[.]?\s*(\d{1,2})(?:[,.]?\s*(\d{4}))?/)
  if (m) {
    const mo = MONTHS_EN[m[1].slice(0, 3).toLowerCase()]
    if (mo != null) {
      const y = m[3] ? Number(m[3]) : year
      return isoDate(y, mo, Number(m[2]))
    }
  }
  // Numeric M/D[/Y] or D/M[/Y]
  m = text.match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?\b/)
  if (m) {
    let a = Number(m[1])
    let b = Number(m[2])
    let y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year
    // Heuristic: if first number > 12 it's day-first (D/M), else month-first.
    let month, day
    if (a > 12) {
      day = a
      month = b - 1
    } else if (b > 12) {
      month = a - 1
      day = b
    } else {
      // Ambiguous: assume month-first (US) since many travelers use that.
      month = a - 1
      day = b
    }
    return isoDate(y, month, day)
  }
  return null
}

function parseTimeToken(text) {
  const m = text.match(/(\d{1,2})[:：](\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  // Plain hour like "9am" / "14h"
  const h = text.match(/\b(\d{1,2})\s*(am|pm|h)\b/i)
  if (h) {
    let hr = Number(h[1])
    if (/pm/i.test(h[2]) && hr < 12) hr += 12
    if (/am/i.test(h[2]) && hr === 12) hr = 0
    return `${String(hr).padStart(2, '0')}:00`
  }
  return ''
}

// Guess a category from free text (title/note).
function guessCategory(row) {
  const hay = [row.title, row.note, row.address].filter(Boolean).join(' ').toLowerCase()
  if (/(hotel|resort|inn|homestay|check[- ]?in|check[- ]?out|住宿|酒店|民宿|入住|退房|airbnb)/.test(hay))
    return 'stay'
  if (/(flight|airline|depart|arrive|airport|机场|航班|起飞|到达|klia|subang)/.test(hay))
    return 'transport'
  if (/(restaurant|eat|dinner|lunch|breakfast|coffee|cafe|餐|吃|食|饭店|美食|餐厅|早餐|午餐|晚餐)/.test(hay))
    return 'food'
  if (/(museum|temple|shrine|park|view|tower|beach|mountain|观光|景点|博物馆|寺庙|公园|山|海|看|游)/.test(hay))
    return 'sight'
  return 'other'
}

// Parse a raw CSV/TSV/粘贴 text block into an array of { headers, rows }.
// Returns rows as arrays of string cells.
export function parseTableText(text) {
  // Normalize line endings.
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cleanLines = lines.filter((l) => l.trim().length > 0)
  if (cleanLines.length === 0) return { headers: [], rows: [] }

  // Detect delimiter: tab if any line contains a tab, else comma, else semicolon.
  const sample = cleanLines.slice(0, 5).join('\n')
  let delim = ','
  if (sample.includes('\t')) delim = '\t'
  else if (!sample.includes(',') && sample.includes(';')) delim = ';'

  const cellsOf = (line) => splitCsvLine(line, delim)
  const matrix = cleanLines.map(cellsOf)
  const width = Math.max(...matrix.map((r) => r.length))
  const norm = matrix.map((r) => {
    const out = [...r]
    while (out.length < width) out.push('')
    return out
  })

  const headers = norm[0].map((h) => h.trim())
  const rows = norm.slice(1).map((r) => r.map((c) => c.trim()))
  return { headers, rows }
}

// RFC4180-ish split: respects quoted fields with embedded delimiters/newlines.
function splitCsvLine(line, delim) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === delim) {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
  }
  out.push(cur)
  return out
}

// Convert SheetJS worksheet to { headers, rows } (arrays of strings).
export function worksheetToTable(ws) {
  const range = ws['!ref']
  if (!range) return { headers: [], rows: [] }
  const data = []
  const ref = XLSX.utils.decode_range(range)
  for (let r = ref.s.r; r <= ref.e.r; r++) {
    const row = []
    for (let c = ref.s.c; c <= ref.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      row.push(cell ? String(cell.v ?? '').trim() : '')
    }
    data.push(row)
  }
  const headers = (data[0] || []).map((h) => h.trim())
  const rows = data.slice(1).map((r) => {
    while (r.length < headers.length) r.push('')
    return r.map((c) => c.trim())
  })
  return { headers, rows }
}

// Bilingual alias map for each target field.
// Lowercase header is matched against these aliases.
const ALIASES = {
  day: ['day', 'date', 'dates', '日期', '天', '第几天', 'dayindex', '日用'],
  time: ['time', 'start', 'start time', '时间', '时刻', '出发时间', 'starting'],
  title: ['title', 'activity', 'activity name', 'name', '事项', '活动', '安排', '内容', 'event', 'task'],
  note: ['note', 'notes', 'remark', 'remarks', '备注', '说明', '描述', 'description', 'detail', 'details'],
  category: ['category', 'type', 'kind', '类型', '类别', '分类', 'cat'],
  address: ['address', 'location', 'place', 'venue', '地址', '地点', '位置', '场所'],
  ticketNo: ['ticket', 'ticketno', 'booking', 'bookingno', 'ref', 'pnr', '票号', '预订号', '确认号', '票', 'booking no'],
  price: ['price', 'cost', 'amount', 'fee', '费用', '价格', '金额', '花费', '总价'],
  currency: ['currency', 'ccy', '币种', '货币', 'currency code'],
}

// Given headers, return { field: columnIndex } mapping using alias matching,
// plus a list of unmapped columns.
export function mapColumns(headers) {
  const mapping = {}
  const used = new Set()
  // Exact + alias match (first non-empty header that matches wins).
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue
      const h = headers[i].toLowerCase().replace(/[\s_]/g, '')
      if (!h) continue
      if (aliases.some((a) => h === a || h.includes(a))) {
        mapping[field] = i
        used.add(i)
        break
      }
    }
  }
  return mapping
}

// Map a category label (free text) to one of our codes.
function normalizeCategory(value) {
  const v = String(value || '').toLowerCase().trim()
  if (!v) return ''
  const lut = {
    food: 'food', 餐饮: 'food', 吃: 'food', 食: 'food', 饭: 'food',
    sight: 'sight', 景点: 'sight', 观光: 'sight', 玩: 'sight', 游: 'sight',
    transport: 'transport', 交通: 'transport', 车: 'transport', 飞机: 'transport', 航班: 'transport',
    stay: 'stay', 住宿: 'stay', 酒店: 'stay', 住: 'stay',
    other: 'other', 其他: 'other',
  }
  if (lut[v]) return lut[v]
  if (v.startsWith('food') || v.includes('food')) return 'food'
  if (v.includes('sight') || v.includes('景点')) return 'sight'
  if (v.includes('transport') || v.includes('交通')) return 'transport'
  if (v.includes('stay') || v.includes('住宿') || v.includes('酒店')) return 'stay'
  return ''
}

// Build normalized activity rows from a parsed table + column mapping.
// Each returned item: { dayIndex, dayOffset, time, title, note, category,
//   address, ticketNo, price(Number|''), currency, raw } where raw keeps the
//   original cells for preview. dayIndex = dayOffset clamped to >=0.
export function buildActivities({ headers, rows }, mapping, { startDate, defaultCurrency = 'MYR' }) {
  const fallbackYear = startDate ? new Date(startDate + 'T00:00:00').getFullYear() : new Date().getFullYear()
  const out = []
  for (const cells of rows) {
    const get = (field) => {
      const i = mapping[field]
      return i == null ? '' : (cells[i] || '')
    }
    const dateCell = get('day')
    const timeCell = get('time')
    const titleCell = get('title')
    const noteCell = get('note')
    const addrCell = get('address')
    const ticketCell = get('ticketNo')
    const priceCell = get('price')
    const currencyCell = get('currency')
    const catCell = get('category')

    if (!titleCell.trim() && !dateCell.trim() && !timeCell.trim()) continue // skip empty rows

    let dayOffset = 0
    const iso = parseDateToken(dateCell, fallbackYear)
    if (iso && startDate) {
      const off = diffDays(startDate, iso)
      dayOffset = off >= 0 ? off : 0
    }

    const time = parseTimeToken(timeCell) || parseTimeToken(dateCell)
    const priceDetect = detectCurrency(String(priceCell || ''))
    let currency = currencyCell.trim().toUpperCase()
    let price = priceDetect.amount
    if (price == null && priceCell.trim() && !Number.isNaN(Number(priceCell))) {
      price = Number(String(priceCell).replace(/,/g, ''))
    }
    if (price == null) price = ''
    if (!currency && priceDetect.currency) currency = priceDetect.currency
    if (!currency && price !== '') currency = defaultCurrency

    const category = normalizeCategory(catCell) || guessCategory({
      title: titleCell, note: noteCell, address: addrCell,
    })

    out.push({
      dayOffset,
      time,
      title: titleCell.trim(),
      note: noteCell.trim(),
      category,
      address: addrCell.trim(),
      ticketNo: ticketCell.trim(),
      price,
      currency,
      raw: cells,
    })
  }
  return out
}

// Convert normalized preview rows into the trip's itinerary map.
// Returns { itinerary, maxOffset }.
export function activitiesToItinerary(rows, createId) {
  const itinerary = {}
  let maxOffset = 0
  for (const r of rows) {
    const offset = r.dayOffset || 0
    maxOffset = Math.max(maxOffset, offset)
    const act = {
      id: createId(),
      time: r.time || '',
      title: r.title || 'Untitled',
      note: r.note || '',
      category: r.category || 'other',
      address: r.address || '',
      ticketNo: r.ticketNo || '',
      price: r.price ?? '',
      currency: r.currency || 'MYR',
      qrNote: '',
    }
    itinerary[offset] = itinerary[offset] || []
    itinerary[offset].push(act)
  }
  return { itinerary, maxOffset }
}

// Re-export XLSX reference so callers can read worksheets via worksheetToTable.
export { XLSX }
