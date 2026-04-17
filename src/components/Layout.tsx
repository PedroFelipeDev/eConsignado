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
  Receipt,
  ChevronDown,
  ChevronRight,
  FolderDown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab: 'dashboard' | 'table' | 'import' | 'import-payment' | 'import-fgts-devido' | 'payments-manager' | 'import-fgts-pgto';
  onTabChange: (tab: 'dashboard' | 'table' | 'import' | 'import-payment' | 'import-fgts-devido' | 'payments-manager' | 'import-fgts-pgto') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Layout({ children, user, onLogout, activeTab, onTabChange, darkMode, onToggleDarkMode }: LayoutProps) {
  const [importMenuOpen, setImportMenuOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'table', label: 'Contratos', icon: TableIcon },
    { id: 'payments-manager', label: 'Gestão de Pagamentos', icon: Receipt },
  ] as const;

  const importSubItems = [
    { id: 'import', label: 'Empréstimo' },
    { id: 'import-payment', label: 'Pgto Consignado' },
    { id: 'import-fgts-devido', label: 'FGTS Devido' },
    { id: 'import-fgts-pgto', label: 'Pgto FGTS' },
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

          {/* Menu Importações */}
          <div className="pt-2">
            <button
              onClick={() => setImportMenuOpen(!importMenuOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
                importSubItems.some(sub => sub.id === activeTab)
                  ? "text-primary dark:text-primary font-bold"
                  : "text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <FolderDown className={cn(
                  "w-5 h-5 transition-colors",
                  importSubItems.some(sub => sub.id === activeTab) ? "text-primary" : "group-hover:text-primary"
                )} />
                <span className="font-semibold text-sm">Importações</span>
              </div>
              {importMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {importMenuOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-border-light dark:border-border-dark space-y-1">
                {importSubItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => onTabChange(subItem.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                      activeTab === subItem.id
                        ? "text-primary font-bold bg-primary/5 shadow-sm"
                        : "text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      activeTab === subItem.id ? "bg-primary scale-125 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "bg-slate-300 dark:bg-slate-600"
                    )} />
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
