import React, { createContext, useContext, useState, ReactNode } from 'react';
import { monthRange } from '../utils/format';

interface MonthContextType {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  monthRange: { from: string; to: string };
  navigateMonth: (offset: number) => void;
  goToCurrentMonth: () => void;
  formatMonthForInput: () => string;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

interface MonthProviderProps {
  children: ReactNode;
}

export const MonthProvider: React.FC<MonthProviderProps> = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const getCurrentMonthRange = () => {
    return monthRange(selectedMonth);
  };

  const navigateMonth = (offset: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonth(newDate);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const formatMonthForInput = () => {
    const year = selectedMonth.getFullYear();
    const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const handleSetSelectedMonth = (date: Date) => {
    setSelectedMonth(new Date(date));
  };

  const value: MonthContextType = {
    selectedMonth,
    setSelectedMonth: handleSetSelectedMonth,
    monthRange: getCurrentMonthRange(),
    navigateMonth,
    goToCurrentMonth,
    formatMonthForInput,
  };

  return (
    <MonthContext.Provider value={value}>
      {children}
    </MonthContext.Provider>
  );
};

export const useMonth = (): MonthContextType => {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
};