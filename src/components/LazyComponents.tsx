'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Componente de loading padrão
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2 text-sm text-gray-600">Carregando...</span>
  </div>
);

// Componente de loading para componentes grandes
const LoadingCard = ({ title }: { title?: string }) => (
  <div className="border rounded-lg p-6 bg-white shadow-sm">
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span className="text-sm text-gray-600">
        {title ? `Carregando ${title}...` : 'Carregando componente...'}
      </span>
    </div>
  </div>
);

// Lazy loading dos componentes principais com code splitting
export const LazyCSVUploader = dynamic(
  () => import('./CSVUploader').then(mod => ({ default: mod.CSVUploader })),
  {
    loading: () => <LoadingCard title="Uploader de CSV" />,
    ssr: false, // Desabilitar SSR para componentes pesados
  }
);

export const LazySchemaAnalyzer = dynamic(
  () => import('./SchemaAnalyzer').then(mod => ({ default: mod.SchemaAnalyzer })),
  {
    loading: () => <LoadingCard title="Analisador de Schema" />,
    ssr: false,
  }
);

export const LazyOutputPublisher = dynamic(
  () => import('./OutputPublisher').then(mod => ({ default: mod.OutputPublisher })),
  {
    loading: () => <LoadingCard title="Publicador de Dados" />,
    ssr: false,
  }
);

export const LazyFeedbackSystem = dynamic(
  () => import('./FeedbackSystem').then(mod => ({ default: mod.FeedbackSystem })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Componentes de visualização (charts, gráficos)
export const LazyDataVisualization = dynamic(
  () => import('./DataVisualization').catch(() => ({ default: () => <div>Componente não encontrado</div> })),
  {
    loading: () => <LoadingCard title="Visualização de Dados" />,
    ssr: false,
  }
);

// Componentes de configuração avançada
export const LazyAdvancedSettings = dynamic(
  () => import('./AdvancedSettings').catch(() => ({ default: () => <div>Configurações não disponíveis</div> })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Componente de relatórios (pode ser pesado)
export const LazyReportsGenerator = dynamic(
  () => import('./ReportsGenerator').catch(() => ({ default: () => <div>Gerador de relatórios não disponível</div> })),
  {
    loading: () => <LoadingCard title="Gerador de Relatórios" />,
    ssr: false,
  }
);

// HOC para lazy loading com Suspense
export function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  loadingComponent?: React.ComponentType,
  errorFallback?: React.ComponentType<{ error: Error }>
) {
  const LazyComponent = dynamic(
    () => Promise.resolve({ default: Component }),
    {
      loading: loadingComponent || LoadingSpinner,
      ssr: false,
    }
  );

  return function WrappedComponent(props: T) {
    return (
      <Suspense fallback={loadingComponent ? <loadingComponent /> : <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Hook para carregamento condicional de componentes
export function useConditionalImport<T>(
  importFn: () => Promise<{ default: T }>,
  condition: boolean
) {
  const [component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (condition && !component && !loading) {
      setLoading(true);
      setError(null);
      
      importFn()
        .then(module => {
          setComponent(module.default);
        })
        .catch(err => {
          setError(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [condition, component, loading, importFn]);

  return { component, loading, error };
}

// Componente para carregamento de features opcionais
export function OptionalFeature({
  featureName,
  importFn,
  fallback,
  children,
}: {
  featureName: string;
  importFn: () => Promise<any>;
  fallback?: React.ReactNode;
  children: (Component: any) => React.ReactNode;
}) {
  const [Component, setComponent] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    importFn()
      .then(module => {
        setComponent(() => module.default || module);
      })
      .catch(err => {
        console.warn(`Failed to load optional feature: ${featureName}`, err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [importFn, featureName]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !Component) {
    return fallback || <div className="text-sm text-gray-500">Feature não disponível</div>;
  }

  return <>{children(Component)}</>;
}

// Preload de componentes críticos
export function preloadCriticalComponents() {
  // Precarregar componentes que provavelmente serão usados
  if (typeof window !== 'undefined') {
    // Usar requestIdleCallback se disponível
    const preload = () => {
      import('./CSVUploader');
      import('./SchemaAnalyzer');
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload);
    } else {
      setTimeout(preload, 1000);
    }
  }
}

// Componente para bundle analysis em desenvolvimento
export function BundleAnalyzer() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-300 rounded p-2 text-xs">
      <div>Bundle Analysis Mode</div>
      <div>Check console for chunk info</div>
    </div>
  );
}

export default {
  LazyCSVUploader,
  LazySchemaAnalyzer,
  LazyOutputPublisher,
  LazyFeedbackSystem,
  LazyDataVisualization,
  LazyAdvancedSettings,
  LazyReportsGenerator,
  withLazyLoading,
  useConditionalImport,
  OptionalFeature,
  preloadCriticalComponents,
  BundleAnalyzer,
};