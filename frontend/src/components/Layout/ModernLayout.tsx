import React from 'react';

interface ModernLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

export default function ModernLayout({ 
  children, 
  title, 
  subtitle, 
  headerActions, 
  className = '' 
}: ModernLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative ${className}`}>
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-emerald-600/10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Container principal */}
      <div className="relative z-10">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div>
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-white/70 mt-1">{subtitle}</p>
                )}
              </div>
              {headerActions && (
                <div className="flex items-center gap-3">
                  {headerActions}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Componente Card moderno para usar dentro do layout
export function ModernCard({ 
  children, 
  className = '', 
  hover = true,
  padding = 'p-6'
}: { 
  children: React.ReactNode; 
  className?: string; 
  hover?: boolean;
  padding?: string;
}) {
  return (
    <div className={`
      backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl 
      ${hover ? 'hover:bg-white/15 hover:border-white/30 transition-all duration-300' : ''}
      ${padding} ${className}
    `}>
      {children}
    </div>
  );
}

// Componente Button moderno
export function ModernButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  [key: string]: any;
}) {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl';
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Componente Input moderno
export function ModernInput({ 
  label, 
  icon, 
  className = '', 
  containerClassName = '',
  ...props 
}: { 
  label?: string; 
  icon?: React.ReactNode; 
  className?: string;
  containerClassName?: string;
  [key: string]: any;
}) {
  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-white/90">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 
            bg-white/10 border border-white/20 rounded-lg 
            text-white placeholder-white/50 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
            transition-all duration-200 backdrop-blur-sm
            ${className}
          `}
          {...props}
        />
      </div>
    </div>
  );
}