import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Layers, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { fetchBuildings, fetchClassrooms, fetchSites } from '@/services/campus';
import { ROUTES } from '@/lib/constants';
import { cn, normalize } from '@/lib/utils';
import type { Building, Classroom, Site } from '@/types';

export function ClassroomsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [site, setSite] = useState('all');
  const [building, setBuilding] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, b, c] = await Promise.all([fetchSites(), fetchBuildings(), fetchClassrooms()]);
      setSites(s);
      setBuildings(b);
      setClassrooms(c);
    } catch {
      setError('No pudimos cargar las aulas. Verifica tu conexión e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    return classrooms.filter((classroom) => {
      const matchesSite = site === 'all' || classroom.siteCode === site;
      const matchesBuilding = building === 'all' || classroom.buildingId === building;
      if (!matchesSite || !matchesBuilding) return false;
      if (!term) return true;
      const haystack = normalize(
        `${classroom.code} ${classroom.name} ${classroom.siteName} ${classroom.buildingName} ${classroom.reference}`,
      );
      return haystack.includes(term);
    });
  }, [classrooms, query, site, building]);

  const hasFilters = query.trim().length > 0 || site !== 'all' || building !== 'all';
  const visibleBuildings = site === 'all' ? buildings : buildings.filter((item) => item.siteCode === site);

  return (
    <div>
      <PageHeader
        eyebrow="Campus"
        title="Buscar aula"
        description="Ubica tu salón por código, pabellón o referencia y sigue la ruta paso a paso."
      />

      <Card className="mb-6">
        <div className="mb-4 border-b border-line pb-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
            <MapPin className="h-4 w-4 text-muted" aria-hidden="true" />
            Sede (dentro de Lima Centro)
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por sede">
            <FilterChip
              active={site === 'all'}
              onClick={() => {
                setSite('all');
                setBuilding('all');
              }}
              disabled={loading}
            >
              Todas
            </FilterChip>
            {sites.map((item) => (
              <FilterChip
                key={item.id}
                active={site === item.code}
                onClick={() => {
                  setSite(item.code);
                  setBuilding('all');
                }}
                disabled={loading}
              >
                {item.shortName}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Input
            label="¿Qué aula buscas?"
            placeholder="Ejemplo: A-201, laboratorio, auditorio…"
            icon={Search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            containerClassName="flex-1"
            hint="Puedes buscar por código, sede, pabellón o referencia."
            disabled={loading}
          />
          <div className="sm:w-56">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
              <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden="true" />
              Pabellón
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por pabellón">
              <FilterChip active={building === 'all'} onClick={() => setBuilding('all')} disabled={loading}>
                Todos
              </FilterChip>
              {visibleBuildings.map((item) => (
                <FilterChip
                  key={item.id}
                  active={building === item.id}
                  onClick={() => setBuilding(item.id)}
                  disabled={loading}
                >
                  {item.code}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando aulas…</span>
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" role="status">
              {results.length} {results.length === 1 ? 'aula encontrada' : 'aulas encontradas'}
            </p>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setSite('all');
                  setBuilding('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No encontramos esa aula"
              description="Revisa el código o prueba con el nombre del pabellón. Si el aula no aparece, repórtalo al SAE."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setSite('all');
                      setBuilding('all');
                    }}
                  >
                    Ver todas las aulas
                  </Button>
                  <Link to={ROUTES.newTicket}>
                    <Button>Reportar al SAE</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((classroom) => (
                <li key={classroom.id}>
                  <Link to={ROUTES.classroom(classroom.id)} className="block h-full">
                    <Card interactive className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-bold text-ink">{classroom.code}</h2>
                          <p className="truncate text-sm text-muted">{classroom.name}</p>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                          <MapPin className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>

                      <dl className="mt-4 space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted">
                          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <dt className="sr-only">Sede</dt>
                          <dd>{classroom.siteName}</dd>
                        </div>
                        <div className="flex items-center gap-2 text-muted">
                          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <dt className="sr-only">Pabellón</dt>
                          <dd>{classroom.buildingName}</dd>
                        </div>
                        <div className="flex items-center gap-2 text-muted">
                          <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <dt className="sr-only">Piso</dt>
                          <dd>Piso {classroom.floor}</dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {classroom.equipment.slice(0, 2).map((item) => (
                          <Badge key={item}>{item}</Badge>
                        ))}
                        {classroom.equipment.length > 2 && (
                          <Badge>+{classroom.equipment.length - 2}</Badge>
                        )}
                      </div>

                      <p className="mt-4 line-clamp-2 text-xs text-muted">{classroom.reference}</p>

                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                        Cómo llegar
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-surface text-muted hover:border-brand hover:text-brand',
      )}
    >
      {children}
    </button>
  );
}
