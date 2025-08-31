import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ImportWizard(){
  const navigate = useNavigate();
  const [step, setStep] = React.useState<1|2|3>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [header, setHeader] = React.useState<string[]>([]);
  const [map, setMap] = React.useState<Record<string, string>>({ date:'date', description:'description', description_extra:'', type:'type', amount:'amount', account_id:'account_id', to_account_id:'', category_id:'category_id', payee_id:'payee_id', status:'status' });
  const [preview, setPreview] = React.useState<string[][]>([]);
  const [result, setResult] = React.useState<any>(null);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [defaultAccountId, setDefaultAccountId] = React.useState<number | ''>('');
  const [categories, setCategories] = React.useState<any[]>([]);
  const [payees, setPayees] = React.useState<any[]>([]);
  const [detectedDelim, setDetectedDelim] = React.useState<"," | ";">(",");
  const [delimiterChoice, setDelimiterChoice] = React.useState<'auto'|'comma'|'semicolon'>('auto');
  const [rawText, setRawText] = React.useState<string>('');
  const [dateFormat, setDateFormat] = React.useState<'Y-M-D'|'D-M-Y'|'M-D-Y'>('D-M-Y');
  const [amountFormat, setAmountFormat] = React.useState<'auto'|'comma'|'dot'>('auto');
  const [typeRule, setTypeRule] = React.useState<'bySign'|'income'|'expense'>('bySign');

  React.useEffect(() => {
    (async () => {
      try {
        const [a, c, p] = await Promise.all([
          api.get('/api/v1/accounts'),
          api.get('/api/v1/categories'),
          api.get('/api/v1/payees'),
        ]);
        const alist = a.data.data || [];
        const clist = c.data.data || [];
        const plist = p.data.data || [];
        setAccounts(alist);
        setCategories(clist);
        setPayees(plist);
        if (alist.length) setDefaultAccountId(alist[0].id);
      } catch {}
    })();
  }, []);

  function detectDelimiter(line: string){
    const commas = (line.match(/,/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    return semis > commas ? ';' : ',';
  }
  function splitCSV(line: string, delim: string){
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (ch === '"'){
        if (inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === delim && !inQ){
        out.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }
  function stripBOM(s: string){ return s.replace(/^\uFEFF/, ''); }
  function rebuildFromRaw(text: string, mode: 'auto'|'comma'|'semicolon'){
    const lines = text.split(/\r?\n/).filter(l => l.trim().length>0);
    if (!lines.length) { setHeader([]); setPreview([]); return; }
    let first = stripBOM(lines[0]);
    lines[0] = first;
    let delim = detectDelimiter(first);
    if (mode==='comma') delim = ',';
    if (mode==='semicolon') delim = ';';
    setDetectedDelim(delim as any);
    const head = splitCSV(lines.shift() as string, delim).map(h => stripBOM(h));
    const rows = lines.slice(0,200).map(l => splitCSV(l, delim));
    setHeader(head); setPreview(rows);
  }
  const parseCSV = async (f: File) => {
    const text = await f.text();
    setRawText(text);
    rebuildFromRaw(text, delimiterChoice);
    setStep(2);
  };

  React.useEffect(() => {
    if (rawText) rebuildFromRaw(rawText, delimiterChoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delimiterChoice]);

  const upload = async () => {
    if (!file) return;
    // helpers for name->id mapping
    const accByName = (n: string) => {
      const t = (n||'').trim().toLowerCase();
      const found = accounts.find((a:any)=> (a.name||'').trim().toLowerCase()===t);
      return found?.id || '';
    };
    const catByName = (n: string) => {
      const t=(n||'').trim().toLowerCase();
      const found = categories.find((c:any)=> (c.name||'').trim().toLowerCase()===t);
      return found?.id || '';
    };
    const payeeByName = (n: string) => {
      const t=(n||'').trim().toLowerCase();
      const found = payees.find((p:any)=> (p.name||'').trim().toLowerCase()===t);
      return found?.id || '';
    };
  const text = rawText || await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length>0);
    if (!lines.length) return;
  let delim = detectedDelim || detectDelimiter(lines[0]);
  if (delimiterChoice==='comma') delim = ',';
  if (delimiterChoice==='semicolon') delim = ';';
  const headerLine = lines.shift() as string;
  const head = splitCSV(headerLine, delim);
  // Compute imported date range from file preview (first/last non-empty date mapped)
  const dateIdx = head.findIndex(h => h === (map['date']||''));
  let minDate: string | null = null; let maxDate: string | null = null;
    const idx: Record<string, number> = {}; head.forEach((h,i)=> idx[h]=i);
    const outHead = ['date','description','type','amount','account_id','category_id','payee_id','status'];
    const outRows = [outHead.join(',')];
    type TransferRow = { date: string; amount: string; fromName: string; toName: string; description: string };
    const transferRows: TransferRow[] = [];
    const normType = (v: string) => {
      const t=(v||'').trim().toLowerCase();
      if (t==='income' || t==='receita' || t==='entrada') return 'RECEITA';
      if (t==='expense' || t==='despesa' || t==='saida' || t==='saída') return 'DESPESA';
      if (t==='transfer' || t==='transferencia' || t==='transferência') return 'TRANSFER';
      return t.toUpperCase();
    };
    const normalizeDate = (s: string) => {
      const t = (s||'').trim(); if (!t) return '';
      // Already ISO yyyy-mm-dd?
      const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const yyyy = iso[1]; const mm = iso[2].padStart(2,'0'); const dd = iso[3].padStart(2,'0');
        return `${yyyy}-${mm}-${dd}`;
      }
      // If it contains '/', assume Brazilian D/M/Y by default
      const dmY = t.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/);
      if (dmY) {
        const dd = dmY[1].padStart(2,'0'); const mm = dmY[2].padStart(2,'0'); const yyyy = dmY[3].length===2? ('20'+dmY[3]) : dmY[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // Fallback to selector behavior with '-' or ambiguous cases
      const m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
      if (!m) return t; // leave as-is; backend will reject invalid
      if (dateFormat==='D-M-Y'){
        const dd = m[1].padStart(2,'0'); const mm = m[2].padStart(2,'0'); const yyyy = m[3].length===2? ('20'+m[3]) : m[3];
        return `${yyyy}-${mm}-${dd}`;
      } else if (dateFormat==='M-D-Y'){
        const mm = m[1].padStart(2,'0'); const dd = m[2].padStart(2,'0'); const yyyy = m[3].length===2? ('20'+m[3]) : m[3];
        return `${yyyy}-${mm}-${dd}`;
      } else {
        // Y-M-D chosen but value not ISO; try swap safely if looks like dd-mm-yyyy
        const parts=t.split('-');
        if (parts.length===3 && parts[0].length<=2) {
          const dd=parts[0].padStart(2,'0'); const mm=parts[1].padStart(2,'0'); const yyyy=parts[2].length===2?('20'+parts[2]):parts[2];
          return `${yyyy}-${mm}-${dd}`;
        }
        return t;
      }
    };
    const normalizeAmount = (s: string) => {
      let v = (s||'').trim();
      let neg = false;
      if (/^\(.*\)$/.test(v)) { neg = true; v = v.slice(1,-1); }
      if (v.startsWith('-')) { neg = true; v = v.slice(1); }
      const commaLike = /^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(v) || (v.includes(',') && !v.includes('.'));
      if (amountFormat==='comma' || (amountFormat==='auto' && commaLike)){
        v = v.replace(/\./g,'');
        v = v.replace(/,/g,'.');
      } else {
        // dot decimal, remove thousand separators
        v = v.replace(/,/g,'');
      }
      const num = parseFloat(v || '0') || 0;
      return neg ? -num : num;
    };
    const esc = (v: string) => {
      if (v==null) v='';
      if (/[",\n]/.test(v)) return '"' + v.replace(/"/g,'""') + '"';
      return v;
    };
    for (const line of lines){
      const cols = splitCSV(line, delim);
      const get = (k: string) => {
        const key = map[k] || '';
        if (!key || !(key in idx)) return '';
        return cols[idx[key]] || '';
      };
      const date = normalizeDate(get('date'));
      if (date) {
        if (!minDate || date < minDate) minDate = date;
        if (!maxDate || date > maxDate) maxDate = date;
      }
      const baseDesc = get('description') || get('descricao');
      const descExtra = map['description_extra'] ? (get('description_extra') || '') : '';
      const description = [baseDesc, descExtra].filter(Boolean).join(' - ');
      const rawType = get('type');
      const rawAmount = get('amount');
      let num = normalizeAmount(rawAmount);
      let t = normType(rawType);
      if (!t || t==='TRANSFER'){
        if (typeRule==='bySign') t = (num < 0 ? 'DESPESA' : 'RECEITA');
        else if (typeRule==='income') t = 'RECEITA';
        else t = 'DESPESA';
      }
      // valor sempre positivo; tipo define o sinal
      num = Math.abs(num);
      // account can be id already or a name; convert name to id; fallback to default
      let accountId = get('account_id');
      if (accountId) {
        const n = Number(accountId);
        if (!Number.isFinite(n) || String(n) !== accountId) {
          const byName = accByName(accountId);
          accountId = byName ? String(byName) : accountId;
        }
      }
      if (!accountId) accountId = accByName(get('account_id')) || String(defaultAccountId || '');
      // optional destination for transfers (name)
      const toName = get('to_account_id') || '';
      // category/payee mapping: if name, convert to id; else keep/null
      let categoryId = get('category_id');
      if (categoryId) {
        const n = Number(categoryId);
        if (!Number.isFinite(n) || String(n) !== categoryId) {
          const byName = catByName(categoryId);
          categoryId = byName ? String(byName) : '';
        }
      }
      let payeeId = get('payee_id');
      if (payeeId) {
        const n = Number(payeeId);
        if (!Number.isFinite(n) || String(n) !== payeeId) {
          const byName = payeeByName(payeeId);
          payeeId = byName ? String(byName) : '';
        }
      }
      const status = (get('status')||'CLEARED').toUpperCase();
  if (!date) { /* invalid date -> skip */ continue; }
  if (t === 'TRANSFER') {
        transferRows.push({ date, amount: String(num), fromName: accountId || get('account_id'), toName, description });
        continue;
      }
      const row = [date, description, t, String(num), accountId, categoryId, payeeId, status].map(x=> esc(String(x||'')));
      // ensure account id fallback if empty
      const ai = 4;
      if ((!row[ai] || row[ai]==='') && defaultAccountId) row[ai] = String(defaultAccountId);
      outRows.push(row.join(','));
    }
    // Send non-transfer rows via CSV import
    const blob = new Blob([outRows.join('\n')], { type: 'text/csv' });
    const fd = new FormData(); fd.append('file', new File([blob], 'mapped.csv', { type: 'text/csv' }));
    const r = await api.post('/api/v1/transactions/import-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const base = r.data.data || r.data || {};
    let inserted = base.inserted || 0; let skipped = base.skipped || 0;
    // Now create transfer rows with dedicated endpoint to keep linkage
    for (const tr of transferRows){
      const fromId = accByName(tr.fromName) || Number(tr.fromName) || defaultAccountId;
      const toId = accByName(tr.toName) || Number(tr.toName) || '';
      if (!fromId || !toId) { skipped++; continue; }
      try {
        const val = Number(tr.amount);
        await api.post('/api/v1/transfers', { description: tr.description || 'Transferência', date: tr.date, amount: val, fromAccountId: fromId, toAccountId: toId });
        inserted += 2;
      } catch {
        skipped++;
      }
    }
  setResult({ inserted, skipped, from: minDate, to: maxDate }); setStep(3);
  };

  return (
    <div className="p-4">
      <h1 className="heading text-2xl mb-4">Importação de CSV</h1>
      {step===1 && (
        <div className="card p-4 space-y-3">
          <input type="file" accept=".csv" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
          <button className="btn-primary text-sm" disabled={!file} onClick={()=> file && parseCSV(file)}>Próximo: Mapear colunas</button>
        </div>
      )}
      {step===2 && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold mb-2">Mapeamento</h2>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[color:var(--text-dim)]">Delimitador:</span>
              <select className="input px-2 py-1" value={delimiterChoice} onChange={(e)=> setDelimiterChoice(e.target.value as any)}>
                <option value="auto">Auto (detectado: {detectedDelim})</option>
                <option value="comma">Vírgula (,)</option>
                <option value="semicolon">Ponto e vírgula (;)</option>
              </select>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[color:var(--text-dim)]">Formato de data:</span>
              <select className="input px-2 py-1" value={dateFormat} onChange={(e)=> setDateFormat(e.target.value as any)}>
                <option value="Y-M-D">AAAA-MM-DD</option>
                <option value="D-M-Y">DD/MM/AAAA</option>
                <option value="M-D-Y">MM/DD/AAAA</option>
              </select>
              <span className="text-[color:var(--text-dim)] ml-4">Formato de valor:</span>
              <select className="input px-2 py-1" value={amountFormat} onChange={(e)=> setAmountFormat(e.target.value as any)}>
                <option value="auto">Auto</option>
                <option value="comma">1.234,56</option>
                <option value="dot">1,234.56</option>
              </select>
              <span className="text-[color:var(--text-dim)] ml-4">Tipo (quando CSV não traz coluna):</span>
              <select className="input px-2 py-1" value={typeRule} onChange={(e)=> setTypeRule(e.target.value as any)}>
                <option value="bySign">Derivar pelo sinal do valor</option>
                <option value="income">Forçar RECEITA</option>
                <option value="expense">Forçar DESPESA</option>
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {['date','description','type','amount','account_id','to_account_id','category_id','payee_id','status'].map((k)=> (
                <label key={k} className="text-sm">{k}
                  <select className="input px-2 py-1 ml-2" value={map[k]||''} onChange={(e)=> setMap({...map, [k]: e.target.value})}>
                    <option value="">--</option>
                    {header.map((h,i)=> (<option key={i} value={h}>{h}</option>))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-2 text-sm">
              <label>description_extra
                <select className="input px-2 py-1 ml-2" value={map['description_extra']||''} onChange={(e)=> setMap({...map, description_extra: e.target.value})}>
                  <option value="">--</option>
                  {header.map((h,i)=> (<option key={i} value={h}>{h}</option>))}
                </select>
                <span className="text-[color:var(--text-dim)] ml-2">(opcional; concatena com descrição)</span>
              </label>
            </div>
            <div className="mt-3 text-sm">
              <label>Conta padrão (usada se a coluna account_id não existir ou estiver vazia):
                <select className="input px-2 py-1 ml-2" value={defaultAccountId} onChange={(e)=> setDefaultAccountId(e.target.value? Number(e.target.value): '')}>
                  <option value="">—</option>
                  {accounts.map((a:any)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </label>
            </div>
            <div className="mt-2 text-xs text-[color:var(--text-dim)]">
              Dica: para transferências, mapeie <b>type</b> para "transfer", <b>account_id</b> com a conta de origem (nome ou id) e <b>to_account_id</b> com a conta destino (nome). Elas serão criadas como duas transações pareadas.
            </div>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold mb-2">Prévia (dedupe visual)</h2>
            <div className="max-h-64 overflow-auto border border-white/5 rounded">
              <table className="w-full text-xs">
                <thead><tr>{header.map((h,i)=>(<th key={i} className="p-1 text-left">{h}</th>))}</tr></thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className={isDuplicate(preview, row, idx) ? 'bg-amber-500/10' : ''}>
                      {row.map((c, j)=>(<td key={j} className="p-1">{c}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded border border-white/10" onClick={()=> setStep(1)}>Voltar</button>
            <button className="btn-primary" onClick={upload}>Importar</button>
          </div>
        </div>
      )}
      {step===3 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Resultado</h2>
          <div className="text-sm mb-3">Inseridos: {result?.inserted??'-'} | Ignorados: {result?.skipped??'-'}</div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={()=> navigate(`/transactions?from=${encodeURIComponent(result?.from||'')}&to=${encodeURIComponent(result?.to||'')}${defaultAccountId?`&accountId=${defaultAccountId}`:''}`)}>Ver transações importadas</button>
            <button className="px-3 py-2 rounded border border-white/10" onClick={()=> setStep(1)}>Nova importação</button>
          </div>
        </div>
      )}
    </div>
  );
}

function isDuplicate(all: string[][], row: string[], idx: number){
  // naive dedupe: same date, description and amount in previous rows
  const key = [row[0],row[1],row[3]].join('|');
  for (let i=0;i<idx;i++){ const r=all[i]; if ([r[0],r[1],r[3]].join('|') === key) return true; }
  return false;
}
