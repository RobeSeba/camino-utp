import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, LifeBuoy, Search, Ticket } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { fetchHelpArticles } from '@/services/content';
import { ROUTES } from '@/lib/constants';
import { cn, normalize } from '@/lib/utils';
import type { HelpArticle } from '@/types';

export function FaqPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHelpArticles();
      setArticles(data);
      setOpenId((current) => current ?? data[0]?.id ?? null);
    } catch {
      setError('No pudimos cargar las preguntas frecuentes. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(articles.map((article) => article.category))),
    [articles],
  );

  const results = useMemo(() => {
    const term = normalize(query.trim());
    return articles.filter((article) => {
      if (category !== 'all' && article.category !== category) return false;
      if (!term) return true;
      return normalize(`${article.title} ${article.excerpt} ${article.body.join(' ')}`).includes(term);
    });
  }, [articles, query, category]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value) {
      setSearchParams({ q: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Centro de ayuda"
        title="Preguntas frecuentes"
        description="Busca por tema o abre una categoría para ver las respuestas del equipo SAE."
        backTo={{ to: ROUTES.help, label: 'Volver al centro de ayuda' }}
      />

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando artículos…</span>
        </div>
      )}

      {!loading && error && (
        <Card className="text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Card className="mb-5">
            <Input
              label="Buscar una respuesta"
              placeholder="Palabra clave, por ejemplo: contraseña, aula, ticket…"
              icon={Search}
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
              <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
                Todas
              </CategoryChip>
              {categories.map((item) => (
                <CategoryChip key={item} active={category === item} onClick={() => setCategory(item)}>
                  {item}
                </CategoryChip>
              ))}
            </div>
          </Card>

          <p className="mb-3 text-sm text-muted" role="status">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </p>

          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No encontramos esa consulta"
              description="Prueba con otras palabras o escribe directamente al SAE. Te responderemos con un ticket de seguimiento."
              action={
                <Link to={ROUTES.newTicket}>
                  <Button icon={Ticket}>Crear un ticket</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {results.map((article) => {
                const isOpen = openId === article.id;
                return (
                  <Card key={article.id} padding="none" className="overflow-hidden">
                    <h2>
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : article.id)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${article.id}`}
                        id={`faq-button-${article.id}`}
                        className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-canvas sm:p-5"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-brand">{article.category}</span>
                          <span className="mt-0.5 block text-sm font-semibold text-ink sm:text-base">
                            {article.title}
                          </span>
                          {!isOpen && (
                            <span className="mt-1 block text-sm text-muted">{article.excerpt}</span>
                          )}
                        </span>
                        <ChevronDown
                          className={cn(
                            'mt-1 h-5 w-5 shrink-0 text-muted transition duration-200',
                            isOpen && 'rotate-180 text-brand',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </h2>

                    {isOpen && (
                      <div
                        id={`faq-panel-${article.id}`}
                        role="region"
                        aria-labelledby={`faq-button-${article.id}`}
                        className="border-t border-line bg-canvas px-4 py-4 sm:px-5"
                      >
                        <ul className="space-y-2.5">
                          {article.body.map((paragraph, idx) => (
                            <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                              {paragraph}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <LifeBuoy className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">¿No encontraste tu respuesta?</p>
                <p className="mt-0.5 text-sm text-muted">
                  Cuéntanos tu caso y recibe un código para seguir la atención.
                </p>
              </div>
            </div>
            <Link to={ROUTES.newTicket} className="w-full sm:w-auto">
              <Button icon={Ticket} fullWidth>
                Crear ticket
              </Button>
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-surface text-muted hover:border-brand hover:text-brand',
      )}
    >
      {children}
    </button>
  );
}
