import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Você não tem permissão para realizar esta operação ou acessar estes dados.";
          }
        }
      } catch (e) {
        if (this.state.error?.message.includes('Missing or insufficient permissions')) {
          errorMessage = "Você não tem permissão para realizar esta operação ou acessar estes dados.";
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark p-4">
          <div className="max-w-md w-full bg-white dark:bg-card-dark rounded-3xl shadow-xl p-8 text-center border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">Ops! Algo deu errado</h2>
            <p className="text-text-muted-light dark:text-text-muted-dark mb-8 text-sm leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/10"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
