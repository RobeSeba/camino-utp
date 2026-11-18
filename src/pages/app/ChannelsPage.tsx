import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { fetchSupportChannels } from '@/services/content';
import { ROUTES } from '@/lib/constants';
import type { ChannelType, SupportChannel } from '@/types';

const ICONS: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  phone: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  office: MapPin,
  chat: MessageCircle,
};

export function ChannelsPage() {
  const { notify } = useToast();
  const [channels, setChannels] = useState<SupportChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSupportChannels();
      setChannels(data);
    } catch {
      setError('No pudimos cargar los canales de atención. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const copyValue = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      notify('Copiado', 'El dato de contacto se copió al portapapeles.', 'info');
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      notify('No se pudo copiar', 'Selecciona el texto manualmente para copiarlo.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Centro de ayuda"
        title="Canales de atención"
        description="Elige el canal que mejor se adapte a tu caso. Ten a mano tu código de estudiante."
        backTo={{ to: ROUTES.help, label: 'Volver al centro de ayuda' }}
      />

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando canales…</span>
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

      {!loading && !error && channels.length === 0 && (
        <EmptyState
          icon={Info}
          title="No hay canales disponibles"
          description="Por ahora no hay canales de atención publicados. Intenta más tarde."
        />
      )}

      {!loading && !error && channels.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => {
            const Icon = ICONS[channel.type] ?? MessageCircle;
            return (
              <Card key={channel.id} className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-ink">{channel.name}</h2>
                    <p className="mt-1 break-words text-sm font-medium text-brand">{channel.value}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted">{channel.description}</p>

                {channel.hours && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {channel.hours}
                  </p>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 self-start"
                  icon={copiedId === channel.id ? Check : Copy}
                  onClick={() => void copyValue(channel.id, channel.value)}
                >
                  {copiedId === channel.id ? 'Copiado' : 'Copiar dato'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <Badge tone="info" withDot>
            Antes de contactarnos
          </Badge>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              Ten a mano tu código de estudiante y el código del aula.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              Si es una incidencia, crea un ticket para dejar registro y seguimiento.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              Adjunta una foto cuando el problema sea visible.
            </li>
          </ul>
          <Link to={ROUTES.newTicket} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            Crear un ticket
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Card>

        <Card className="bg-canvas">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-ink">Atención en horario académico</h2>
              <p className="mt-1 text-sm text-muted">
                Fuera del horario, los mensajes quedan registrados y se atienden el siguiente día
                hábil. Para emergencias de seguridad, acude a la garita del campus.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
