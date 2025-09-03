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
  // Use UTC to avoid timezone issues
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // First day of the month
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  
  // Last day of the month
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  
  return { from, to };
}