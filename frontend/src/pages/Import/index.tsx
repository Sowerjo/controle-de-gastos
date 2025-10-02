import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ModernLayout, { ModernCard, ModernButton } from '../../components/Layout/ModernLayout';
// Custom SVG Icons
const Icons = {
  upload: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
    </svg>
  ),
  eye: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/>
      <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/>
    </svg>
  ),
  arrowLeft: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
    </svg>
  ),
  arrowRight: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
    </svg>
  ),
  document: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z"/>
      <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
    </svg>
  )
};

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
    <ModernLayout title="Importação de CSV">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="text-blue-500">{Icons.upload}</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Importação de CSV
          </h1>
        </div>

        {step===1 && (
          <ModernCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="text-blue-500">{Icons.document}</div>
              <h2 className="text-xl font-semibold">Selecionar Arquivo</h2>
            </div>
            
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <div className="text-gray-400 mx-auto mb-4">{Icons.upload}</div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Selecione um arquivo CSV para importar suas transações
                </p>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e)=> setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    dark:file:bg-blue-900/20 dark:file:text-blue-400
                    hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30
                    file:cursor-pointer cursor-pointer"
                />
                {file && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>
              
              <div className="flex justify-end">
                <ModernButton
                  variant="primary"
                  disabled={!file}
                  onClick={()=> file && parseCSV(file)}
                  className="flex items-center gap-2"
                >
                  Próximo: Mapear colunas
                  {Icons.arrowRight}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        )}
      {step===2 && (
        <div className="space-y-6">
          <ModernCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="text-blue-500">{Icons.settings}</div>
              <h2 className="text-xl font-semibold">Configurações de Importação</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delimitador
                </label>
                <select 
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  value={delimiterChoice} 
                  onChange={(e)=> setDelimiterChoice(e.target.value as any)}
                >
                  <option value="auto">Auto (detectado: {detectedDelim})</option>
                  <option value="comma">Vírgula (,)</option>
                  <option value="semicolon">Ponto e vírgula (;)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Formato de data
                </label>
                <select 
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  value={dateFormat} 
                  onChange={(e)=> setDateFormat(e.target.value as any)}
                >
                  <option value="Y-M-D">AAAA-MM-DD</option>
                  <option value="D-M-Y">DD/MM/AAAA</option>
                  <option value="M-D-Y">MM/DD/AAAA</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Formato de valor
                </label>
                <select 
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  value={amountFormat} 
                  onChange={(e)=> setAmountFormat(e.target.value as any)}
                >
                  <option value="auto">Auto</option>
                  <option value="comma">1.234,56</option>
                  <option value="dot">1,234.56</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo padrão
                </label>
                <select 
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                  value={typeRule} 
                  onChange={(e)=> setTypeRule(e.target.value as any)}
                >
                  <option value="bySign">Derivar pelo sinal do valor</option>
                  <option value="income">Forçar RECEITA</option>
                  <option value="expense">Forçar DESPESA</option>
                </select>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Mapeamento de Colunas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['date','description','type','amount','account_id','to_account_id','category_id','payee_id','status'].map((k)=> (
                  <div key={k}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                      {k.replace('_', ' ')}
                    </label>
                    <select 
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                      value={map[k]||''} 
                      onChange={(e)=> setMap({...map, [k]: e.target.value})}
                    >
                      <option value="">-- Selecionar --</option>
                      {header.map((h,i)=> (<option key={i} value={h}>{h}</option>))}
                    </select>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição Extra
                    <span className="text-gray-500 text-xs ml-1">(opcional)</span>
                  </label>
                  <select 
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                    value={map['description_extra']||''} 
                    onChange={(e)=> setMap({...map, description_extra: e.target.value})}
                  >
                    <option value="">-- Selecionar --</option>
                    {header.map((h,i)=> (<option key={i} value={h}>{h}</option>))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Será concatenado com a descrição principal
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Conta Padrão
                  </label>
                  <select 
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" 
                    value={defaultAccountId} 
                    onChange={(e)=> setDefaultAccountId(e.target.value? Number(e.target.value): '')}
                  >
                    <option value="">— Selecionar —</option>
                    {accounts.map((a:any)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Usada quando account_id não existir ou estiver vazia
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Dica para transferências:</strong> Mapeie <strong>type</strong> para "transfer", 
                  <strong> account_id</strong> com a conta de origem e <strong>to_account_id</strong> com a conta destino. 
                  Elas serão criadas como duas transações pareadas.
                </p>
              </div>
            </div>
          </ModernCard>
          <ModernCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="text-blue-500">{Icons.eye}</div>
              <h2 className="text-xl font-semibold">Prévia dos Dados</h2>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 bg-amber-400 rounded"></span>
                  Linhas destacadas em amarelo são possíveis duplicatas
                </span>
              </p>
            </div>
            
            <div className="max-h-96 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    {header.map((h,i)=>(
                      <th key={i} className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {preview.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        isDuplicate(preview, row, idx) ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                      }`}
                    >
                      {row.map((c, j)=>(
                        <td key={j} className="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ModernCard>
          
          <div className="flex justify-between">
            <ModernButton
              variant="secondary"
              onClick={()=> setStep(1)}
              className="flex items-center gap-2"
            >
              {Icons.arrowLeft}
              Voltar
            </ModernButton>
            <ModernButton
              variant="primary"
              onClick={upload}
              className="flex items-center gap-2"
            >
              Importar Dados
              {Icons.upload}
            </ModernButton>
          </div>
        </div>
      )}
      {step===3 && (
        <ModernCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="text-green-500">{Icons.check}</div>
            <h2 className="text-xl font-semibold">Importação Concluída</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-green-600 dark:text-green-400">{Icons.check}</div>
                <span className="font-medium text-green-800 dark:text-green-200">Inseridos</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                {result?.inserted ?? '-'}
              </p>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </span>
                <span className="font-medium text-amber-800 dark:text-amber-200">Ignorados</span>
              </div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                {result?.skipped ?? '-'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <ModernButton
              variant="primary"
              onClick={()=> navigate(`/transactions?from=${encodeURIComponent(result?.from||'')}&to=${encodeURIComponent(result?.to||'')}${defaultAccountId?`&accountId=${defaultAccountId}`:''}`)}
            >
              Ver Transações Importadas
            </ModernButton>
            <ModernButton
              variant="secondary"
              onClick={()=> setStep(1)}
            >
              Nova Importação
            </ModernButton>
            <ModernButton
              variant="secondary"
              onClick={()=> navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              Finalizar
              {Icons.arrowRight}
            </ModernButton>
          </div>
        </ModernCard>
      )}
      </div>
    </ModernLayout>
  );
}

function isDuplicate(all: string[][], row: string[], idx: number){
  // naive dedupe: same date, description and amount in previous rows
  const key = [row[0],row[1],row[3]].join('|');
  for (let i=0;i<idx;i++){ const r=all[i]; if ([r[0],r[1],r[3]].join('|') === key) return true; }
  return false;
}
