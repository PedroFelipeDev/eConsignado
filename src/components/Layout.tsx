import React from 'react';
import { User } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  FileUp, 
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Receipt
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab: 'dashboard' | 'table' | 'import' | 'import-payment' | 'payments-manager';
  onTabChange: (tab: 'dashboard' | 'table' | 'import' | 'import-payment' | 'payments-manager') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Layout({ children, user, onLogout, activeTab, onTabChange, darkMode, onToggleDarkMode }: LayoutProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'table', label: 'Contratos', icon: TableIcon },
    { id: 'payments-manager', label: 'Gestão de Pagamentos', icon: Receipt },
    { id: 'import', label: 'Importar Empréstimo', icon: FileUp },
    { id: 'import-payment', label: 'Importar Pgto Consignado', icon: FileUp },
  ] as const;

  const userMetadata = user.user_metadata;

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark flex flex-col transition-colors duration-300 shadow-sm z-10">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">e</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-text-light dark:text-text-dark tracking-tight">Consignado</h1>
          </div>
          <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark font-medium uppercase tracking-widest">AUDITORIA</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activeTab === item.id ? "text-white" : "text-text-muted-light dark:text-text-muted-dark group-hover:text-primary"
              )} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-4">
          <div className="px-4 py-2">
            <div className="h-px bg-border-light dark:bg-border-dark w-full" />
          </div>

          <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-primary" />}
            <span className="font-semibold text-sm">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <div className="bg-bg-light dark:bg-bg-dark rounded-2xl p-4 flex items-center gap-3 border border-border-light dark:border-border-dark">
            {userMetadata?.avatar_url ? (
              <img src={userMetadata.avatar_url} alt={userMetadata.full_name || ''} className="w-10 h-10 rounded-full ring-2 ring-primary/20" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-sm">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-text-light dark:text-text-dark truncate">{userMetadata?.full_name || user.email}</p>
              <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark truncate">{user.email}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 bg-bg-light dark:bg-bg-dark">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
