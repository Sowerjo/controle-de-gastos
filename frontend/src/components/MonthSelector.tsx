import React from 'react';
import { useMonth } from '../contexts/MonthContext';

interface MonthSelectorProps {
  className?: string;
  showCurrentButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ 
  className = '', 
  showCurrentButton = true,
  size = 'md'
}) => {
  const { formatMonthForInput, navigateMonth, goToCurrentMonth, setSelectedMonth } = useMonth();

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [year, month] = e.target.value.split('-');
      const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      setSelectedMonth(targetDate);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-2 text-base'
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <button 
        className={`${buttonSizeClasses[size]} rounded border border-white/10 hover:bg-white/5 transition-colors`}
        onClick={() => navigateMonth(-1)}
        title="Mês anterior"
      >
        ◀
      </button>
      
      <input 
        type="month" 
        className={`input ${sizeClasses[size]} min-w-[140px] text-center`}
        value={formatMonthForInput()} 
        onChange={handleMonthChange}
        title="Selecionar mês"
      />
      
      <button 
        className={`${buttonSizeClasses[size]} rounded border border-white/10 hover:bg-white/5 transition-colors`}
        onClick={() => navigateMonth(1)}
        title="Próximo mês"
      >
        ▶
      </button>
      
      {showCurrentButton && (
        <button 
          className={`${buttonSizeClasses[size]} rounded border border-white/10 hover:bg-white/5 transition-colors`}
          onClick={goToCurrentMonth}
          title="Ir para o mês atual"
        >
          Hoje
        </button>
      )}
    </div>
  );
};

export default MonthSelector;