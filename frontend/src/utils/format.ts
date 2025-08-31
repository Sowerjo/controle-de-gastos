export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function monthRange(date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}