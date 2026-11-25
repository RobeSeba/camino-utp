import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Headphones,
  LifeBuoy,
  MessageSquarePlus,
  Search,
  Ticket,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { fetchHelpArticles, fetchSupportChannels } from '@/services/content';
import { ROUTES } from '@/lib/constants';
import type { HelpArticle, SupportChannel } from '@/types';

export function HelpCenterPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [channels, setChannels] = useState<SupportChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [help, chans] = await Promise.all([fetchHelpArticles(), fetchSupportChannels()]);
      setArticles(help);
      setChannels(chans);
    } catch {
      setError('No pudimos cargar el contenido de ayuda. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `${ROUTES.faq}?q=${encodeURIComponent(term)}` : ROUTES.faq);
  };

  const popular = articles.filter((article) => article.popular).slice(0, 3);

  const options = [
    {
      to: ROUTES.faq,
      icon: BookOpen,
      title: 'Preguntas frecuentes',
      description: 'Respuestas rápidas sobre aulas, tickets, cuenta y accesibilidad.',
      meta: `${articles.length} artículos`,
    },
    {
      to: ROUTES.channels,
      icon: Headphones,
      title: 'Canales de atención',
      description: 'Teléfono, correo, WhatsApp y atención presencial del SAE.',
      meta: `${channels.length} canales`,
    },
    {
      to: ROUTES.newTicket,
      icon: MessageSquarePlus,
      title: 'Reportar una incidencia',
      description: 'Registra un problema del campus y recibe un código de seguimiento.',
      meta: 'Respuesta según categoría',
    },
    {
      to: ROUTES.tickets,
      icon: Ticket,
      title: 'Mis tickets',
      description: 'Consulta el estado, la conversación y el historial de tus reportes.',
      meta: 'Seguimiento en línea',
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Soporte"
        title="Centro de ayuda"
        description="Resuelve tus dudas o reporta una incidencia al Servicio de Atención al Estudiante."
      />

      <Card className="mb-6 bg-brand text-white" padding="lg">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            Estamos para ayudarte
          </p>
          <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
            ¿En qué podemos ayudarte hoy?
          </h2>
          <p className="mt-1.5 text-sm text-white/85">
            Busca una respuesta en nuestra base de conocimiento o crea un ticket si necesitas
            atención personalizada.
          </p>

          <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="ayuda-search" className="sr-only">
                Buscar en el centro de ayuda
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="ayuda-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ejemplo: cómo llegar a mi aula, tiempo de respuesta…"
                  className="h-11 w-full rounded-xl border border-transparent bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="border border-white/30 !bg-white !text-[#a50817] hover:!bg-white/90"
            >
              Buscar
            </Button>
          </form>
        </div>
      </Card>

      {loading && (
        <div className="mb-6 flex items-center gap-3 text-sm text-muted" role="status">
          <Spinner className="h-4 w-4" /> Cargando contenido de ayuda…
        </div>
      )}
      {!loading && error && (
        <Card className="mb-6">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <Link key={option.to} to={option.to} className="group">
            <Card interactive className="flex h-full items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                <option.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink">{option.title}</h2>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-sm text-muted">{option.description}</p>
                <p className="mt-2 text-xs font-medium text-brand">{option.meta}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="populares">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="populares" className="text-base font-semibold">
              Consultas más frecuentes
            </h2>
            <Link to={ROUTES.faq} className="text-sm font-semibold text-brand hover:underline">
              Ver todas
            </Link>
          </div>
          {!loading && !error && (
            <ul className="space-y-2">
              {popular.map((article) => (
                <li key={article.id}>
                  <Link
                    to={`${ROUTES.faq}?q=${encodeURIComponent(article.title)}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-brand hover:bg-brand-soft"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{article.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{article.category}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {popular.length === 0 && (
                <li className="text-sm text-muted">No hay artículos destacados por ahora.</li>
              )}
            </ul>
          )}
        </section>

        <section aria-labelledby="canales-resumen">
          <h2 id="canales-resumen" className="mb-3 text-base font-semibold">
            Atención directa
          </h2>
          <Card className="space-y-4">
            {channels.slice(0, 2).map((channel) => (
              <div key={channel.id}>
                <p className="text-sm font-semibold text-ink">{channel.name}</p>
                <p className="mt-0.5 text-sm text-brand break-words">{channel.value}</p>
                {channel.hours && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {channel.hours}
                  </p>
                )}
              </div>
            ))}
            {!loading && !error && channels.length === 0 && (
              <p className="text-sm text-muted">No hay canales disponibles.</p>
            )}
            <Link to={ROUTES.channels} className="block border-t border-line pt-3">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                Ver todos los canales
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </Card>

          <Card className="mt-4">
            <Badge tone="success" withDot>
              Tiempo de respuesta
            </Badge>
            <p className="mt-2 text-sm text-muted">
              Los tickets de <span className="font-medium text-ink">accesos</span> se atienden en un
              máximo de 6 horas hábiles. Los de infraestructura, hasta en 24 horas.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
