import React from 'react';

type CurrencyInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
  onValueChange?: (n: number) => void;
};

// Converte string BR ("1.234,56") para número decimal
export const parseBRNumber = (v: string | number): number => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v || '').trim();
  if (!s) return 0;
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};

// Limpa entrada durante digitação (permite digitação livre)
export const cleanBRInput = (raw: string): string => {
  const s = String(raw || '').trim();
  if (!s) return '';
  // Remove caracteres inválidos, mantém apenas dígitos, vírgula e ponto
  let cleaned = s.replace(/[^0-9,\.]/g, '');
  // Permite apenas uma vírgula
  const commaCount = (cleaned.match(/,/g) || []).length;
  if (commaCount > 1) {
    const firstComma = cleaned.indexOf(',');
    cleaned = cleaned.substring(0, firstComma + 1) + cleaned.substring(firstComma + 1).replace(/,/g, '');
  }
  // Limita casas decimais a 2
  const parts = cleaned.split(',');
  if (parts.length > 1 && parts[1].length > 2) {
    cleaned = parts[0] + ',' + parts[1].substring(0, 2);
  }
  return cleaned;
};

// Formata para exibição final com separadores de milhar
export const formatBRInput = (raw: string): string => {
  const s = String(raw || '').trim();
  if (!s) return '';
  
  // Remove caracteres inválidos
  const only = s.replace(/[^0-9,\.]/g, '');
  const parts = only.split(',');
  
  // Parte inteira (remove pontos existentes)
  let intPart = parts[0].replace(/\./g, '');
  // Parte decimal
  let decPart = parts.length > 1 ? parts[1] : '';
  
  // Se não há dígitos na parte inteira, usar 0
  if (!intPart) intPart = '0';
  
  // Formatar parte inteira com separadores de milhar
  const intNum = Number(intPart);
  const intFormatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(isNaN(intNum) ? 0 : intNum);
  
  // Se há parte decimal, incluir
  if (parts.length > 1) {
    // Limitar a 2 casas decimais
    decPart = decPart.substring(0, 2);
    // Se tem apenas 1 dígito decimal, preencher com 0
    if (decPart.length === 1) decPart += '0';
    // Se não tem dígitos decimais, usar 00
    if (decPart.length === 0) decPart = '00';
    return `${intFormatted},${decPart}`;
  }
  
  // Se não há vírgula, adicionar ,00
  return `${intFormatted},00`;
};

// Formata número para string BR sem símbolo ("1.234,56")
export const fmtNumberBR = (n: number): string => {
  const x = typeof n === 'number' && !isNaN(n) ? n : 0;
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
};

export default function CurrencyInput({ value, onChange, onValueChange, placeholder, className, ...rest }: CurrencyInputProps){
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Durante a digitação, apenas limpa caracteres inválidos
    const cleaned = cleanBRInput(e.target.value);
    onChange(cleaned);
    if (onValueChange) onValueChange(parseBRNumber(cleaned));
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // No blur, aplica formatação completa com separadores de milhar
    const formatted = formatBRInput(e.target.value);
    const parsedValue = parseBRNumber(formatted);
    onChange(formatted);
    if (onValueChange) onValueChange(parsedValue);
  };
  
  return (
    <input 
      inputMode="decimal"
      className={className || 'input px-2 py-2 tnum'}
      placeholder={placeholder || '0,00'}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      {...rest}
    />
  );
}