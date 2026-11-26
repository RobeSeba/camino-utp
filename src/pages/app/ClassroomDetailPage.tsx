import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Building2,
  Info,
  Layers,
  MapPin,
  MessageSquarePlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { CampusMap } from '@/components/CampusMap';
import { fetchClassroomByIdOrCode } from '@/services/campus';
import { ROUTES } from '@/lib/constants';
import type { Classroom } from '@/types';

export function ClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [arrivalModalOpen, setArrivalModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!classroomId) {
        setClassroom(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setCurrentStep(0);
      setArrivalModalOpen(false);
      try {
        const data = await fetchClassroomByIdOrCode(classroomId);
        if (!active) return;
        setClassroom(data);
      } catch {
        if (active) setError('No pudimos cargar la información del aula. Inténtalo nuevamente.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [classroomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
        <Spinner className="h-5 w-5" />
        <span className="ml-3 text-sm">Cargando aula…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Aula" backTo={{ to: ROUTES.classrooms, label: 'Volver al buscador' }} />
        <Card className="text-center">
          <p className="text-sm text-danger">{error}</p>
          <Link to={ROUTES.classrooms} className="mt-4 inline-block">
            <Button variant="secondary">Volver al buscador</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div>
        <PageHeader
          title="Aula no encontrada"
          backTo={{ to: ROUTES.classrooms, label: 'Volver al buscador' }}
        />
        <EmptyState
          icon={MapPin}
          title="No pudimos ubicar esta aula"
          description="El código no existe en el campus seleccionado o cambió de ubicación. Repórtalo para actualizar la información."
          action={
            <Link to={ROUTES.classrooms}>
              <Button>Buscar otra aula</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isLastStep = classroom.directions.length > 0 && currentStep === classroom.directions.length - 1;
  const handleNextStep = () => {
    const nextStep = Math.min(classroom.directions.length - 1, currentStep + 1);
    setCurrentStep(nextStep);

    if (nextStep === classroom.directions.length - 1) {
      setArrivalModalOpen(true);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${classroom.siteName} · ${classroom.buildingName} · Piso ${classroom.floor}`}
        title={`Aula ${classroom.code}`}
        description={classroom.reference}
        backTo={{ to: ROUTES.classrooms, label: 'Volver al buscador' }}
        actions={
          <Link to={`${ROUTES.newTicket}?aula=${classroom.code}`}>
            <Button variant="secondary" size="sm" icon={MessageSquarePlus}>
              Reportar problema
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{classroom.code}</Badge>
              <Badge tone="info">{classroom.buildingName}</Badge>
              <Badge>Piso {classroom.floor}</Badge>
            </div>

            <h2 className="mt-3 text-xl font-bold">{classroom.name}</h2>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="Sede" value={classroom.siteName} />
              <InfoRow icon={Building2} label="Pabellón" value={classroom.buildingName} />
              <InfoRow icon={Layers} label="Piso" value={`Piso ${classroom.floor}`} />
              <InfoRow icon={Users} label="Capacidad" value={`${classroom.capacity} estudiantes`} />
              <InfoRow icon={MapPin} label="Referencia" value={classroom.reference} />
            </dl>

            {classroom.equipment.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Equipamiento
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {classroom.equipment.map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Ruta paso a paso */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Ruta paso a paso</h2>
                <p className="mt-0.5 text-sm text-muted">
                  En {classroom.siteName} · {classroom.buildingName} · Piso {classroom.floor}
                  {classroom.directions.length > 0 &&
                    ` · Paso ${currentStep + 1} de ${classroom.directions.length}`}
                </p>
              </div>
              <Badge tone="success">Ruta accesible</Badge>
            </div>

            {classroom.directions.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No hay indicaciones registradas para esta aula.</p>
            ) : (
              <>
                <div
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="mt-5 rounded-2xl border-2 border-brand bg-brand-soft p-5 shadow-float"
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-ink text-lg font-bold text-brand-soft shadow-sm"
                    >
                      {currentStep + 1}
                    </span>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                        Paso {currentStep + 1} de {classroom.directions.length}
                      </p>
                      <p className="mt-2 text-base font-semibold leading-relaxed text-ink">
                        {classroom.directions[currentStep]}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-line pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArrowLeft}
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                  >
                    Anterior
                  </Button>
                  {!isLastStep && (
                    <Button size="sm" onClick={handleNextStep}>
                      Siguiente paso
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card padding="none" className="overflow-hidden">
            <CampusMap classroom={classroom} className="h-72 sm:h-80" />
            <div className="flex items-start gap-2.5 border-t border-line p-4 text-xs text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Toca el mapa para abrirlo en 3D, girar el campus y calcular el tiempo aproximado
                entre dos puntos. La señalización física prevalece hasta contar con los planos
                oficiales.
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
                <Accessibility className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">¿Necesitas una ruta accesible?</h2>
                <p className="mt-1 text-sm text-muted">
                  Consulta las rutas y accesos disponibles en el campus. Si requieres acompañamiento,
                  escríbenos al SAE.
                </p>
                <Link
                  to={ROUTES.newTicket}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                >
                  Solicitar apoyo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Modal
                  open={arrivalModalOpen}
                  onClose={() => setArrivalModalOpen(false)}
                  title="¡Llegaste a tu aula!"
                  description={`Has completado las indicaciones para llegar al aula ${classroom.code}.`}
                  footer={<Button onClick={() => setArrivalModalOpen(false)}>Entendido</Button>}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-canvas p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-sm font-medium text-ink">{value || '—'}</dd>
      </div>
    </div>
  );
}
