import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Paperclip,
  Send,
  Ticket as TicketIcon,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketsContext';
import { useToast } from '@/context/ToastContext';
import { fetchClassrooms } from '@/services/campus';
import { fetchTicketCategories } from '@/services/content';
import { setTicketAttachment } from '@/services/tickets';
import { uploadTicketAttachment } from '@/services/storage';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Classroom, TicketCategory, TicketPriority } from '@/types';

const PRIORITIES: Array<{ value: TicketPriority; label: string; description: string }> = [
  { value: 'low', label: 'Baja', description: 'No impide el desarrollo de clases.' },
  { value: 'medium', label: 'Media', description: 'Afecta parcialmente la actividad.' },
  { value: 'high', label: 'Alta', description: 'Bloquea una clase o implica riesgo.' },
];

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

interface FormState {
  categoryId: string;
  classroomId: string;
  subject: string;
  description: string;
  priority: TicketPriority;
}

type FormErrors = Partial<Record<'categoryId' | 'subject' | 'description', string>>;

export function NewTicketPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { createTicket } = useTickets();
  const { notify } = useToast();
  const navigate = useNavigate();

  const classroomFromQuery = searchParams.get('aula') ?? '';
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    categoryId: '',
    classroomId: '',
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [cats, rooms] = await Promise.all([fetchTicketCategories(), fetchClassrooms()]);
        if (!active) return;
        setCategories(cats);
        setClassrooms(rooms);
        if (classroomFromQuery) {
          const match = rooms.find(
            (r) => r.code.toLowerCase() === classroomFromQuery.toLowerCase() || r.id === classroomFromQuery,
          );
          if (match) {
            setForm((current) => ({ ...current, classroomId: match.id }));
          }
        }
      } catch {
        if (active) setOptionsError('No pudimos cargar las opciones del formulario. Inténtalo nuevamente.');
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [classroomFromQuery]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId),
    [categories, form.categoryId],
  );

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.categoryId) next.categoryId = 'Selecciona la categoría que mejor describe el caso.';
    if (form.subject.trim().length < 8) next.subject = 'Describe el asunto en al menos 8 caracteres.';
    if (form.description.trim().length < 20) {
      next.description = 'Agrega más detalle (mínimo 20 caracteres) para poder atenderte.';
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      notify('Revisa el formulario', 'Faltan datos obligatorios para registrar el ticket.', 'error');
      return;
    }
    if (!user) {
      notify('Sesión no disponible', 'Inicia sesión nuevamente para registrar el ticket.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedRoom = classrooms.find((c) => c.id === form.classroomId) ?? null;
      const ticketId = attachmentFile ? crypto.randomUUID() : undefined;

      const result = await createTicket({
        id: ticketId,
        studentId: user.id,
        subject: form.subject,
        description: form.description,
        categoryId: form.categoryId,
        classroomId: selectedRoom?.id ?? null,
        classroomCode: selectedRoom?.code ?? null,
        priority: form.priority,
        attachmentPath: null,
      });

      if (!result.ok || !result.code || !result.id) {
        notify('No se pudo registrar el ticket', result.error ?? 'Inténtalo nuevamente.', 'error');
        return;
      }

      if (attachmentFile) {
        try {
          const path = await uploadTicketAttachment(result.id, attachmentFile);
          await setTicketAttachment(result.id, path);
          notify('Ticket registrado', 'Tu reporte y el archivo adjunto se enviaron correctamente.');
        } catch {
          notify(
            'Ticket registrado, pero el adjunto no se pudo subir',
            `Se creó el ticket ${result.code}. Puedes volver a intentarlo adjuntando el archivo desde el detalle si es necesario.`,
            'error',
          );
        }
      } else {
        notify('Ticket registrado', 'Recibimos tu reporte y te mostraremos su seguimiento.');
      }

      navigate(ROUTES.ticket(result.code), { state: { justCreated: true } });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <div>
        <PageHeader
          eyebrow="Soporte"
          title="Reportar una incidencia"
          description="Completa el formulario y recibe un código para seguir la atención del SAE."
          backTo={{ to: ROUTES.help, label: 'Volver al centro de ayuda' }}
        />
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando formulario…</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Soporte"
        title="Reportar una incidencia"
        description="Completa el formulario y recibe un código para seguir la atención del SAE."
        backTo={{ to: ROUTES.help, label: 'Volver al centro de ayuda' }}
      />

      {optionsError && (
        <Card className="mb-5 text-center">
          <p className="text-sm text-danger">{optionsError}</p>
          <Button variant="secondary" className="mt-3" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <form onSubmit={handleSubmit} noValidate>
          <Card padding="lg">
            <div className="flex items-start gap-2.5 rounded-xl border border-line border-l-4 border-l-info bg-info-soft p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <p className="text-muted">
                Los campos marcados con <span className="font-semibold text-danger">*</span> son
                obligatorios. Cuanto más detalle brindes, más rápida será la atención.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <Select
                label="Categoría"
                name="category"
                placeholder="Selecciona una categoría"
                value={form.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                error={errors.categoryId}
                hint={selectedCategory?.description}
                required
                disabled={categories.length === 0}
              />

              <Select
                label="Aula o ubicación"
                name="classroom"
                placeholder="No aplica / otra ubicación"
                value={form.classroomId}
                onChange={(event) => update('classroomId', event.target.value)}
                options={classrooms.map((classroom) => ({
                  value: classroom.id,
                  label: `${classroom.code} · ${classroom.name}`,
                }))}
                optional
                hint="Indícalo si la incidencia ocurre en un aula específica."
              />

              <Input
                label="Asunto"
                name="subject"
                placeholder="Ejemplo: el proyector del aula B-204 no enciende"
                value={form.subject}
                onChange={(event) => update('subject', event.target.value)}
                error={errors.subject}
                maxLength={90}
                required
              />

              <div>
                <Textarea
                  label="Descripción del problema"
                  name="description"
                  placeholder="¿Qué ocurrió? ¿Desde cuándo? ¿Afecta a otras personas? Incluye cualquier detalle útil."
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  error={errors.description}
                  maxLength={600}
                  rows={5}
                  required
                />
                <p
                  className={cn(
                    'mt-1 text-right text-xs',
                    form.description.length > 540 ? 'text-warning' : 'text-muted',
                  )}
                >
                  {form.description.length}/600 caracteres
                </p>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Prioridad</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PRIORITIES.map((priority) => (
                    <label
                      key={priority.value}
                      className={cn(
                        'flex cursor-pointer flex-col rounded-xl border p-3 transition',
                        form.priority === priority.value
                          ? 'border-brand bg-brand-soft'
                          : 'border-line hover:border-brand',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="priority"
                          value={priority.value}
                          checked={form.priority === priority.value}
                          onChange={() => update('priority', priority.value)}
                          className="h-4 w-4 accent-brand"
                        />
                        <span className="text-sm font-semibold text-ink">{priority.label}</span>
                      </span>
                      <span className="mt-1 text-xs text-muted">{priority.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <p className="mb-1.5 text-sm font-medium text-ink">
                  Evidencia <span className="text-xs font-normal text-muted">(opcional)</span>
                </p>
                {attachmentFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                      <Paperclip className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                      <span className="truncate">{attachmentFile.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachmentFile(null)}
                      className="rounded-md p-1 text-muted transition hover:text-danger"
                      aria-label="Quitar archivo adjunto"
                      disabled={submitting}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas px-4 py-6 text-center transition hover:border-brand">
                    <Paperclip className="h-6 w-6 text-muted" aria-hidden="true" />
                    <span className="mt-2 text-sm font-medium text-ink">Adjuntar evidencia</span>
                    <span className="mt-0.5 text-xs text-muted">Imagen (JPG, PNG, WebP) o PDF, máximo 5 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (!file) return;
                        if (!ACCEPTED_TYPES.includes(file.type)) {
                          notify('Formato no permitido', 'Adjunta una imagen (JPG, PNG, WebP) o un PDF.', 'error');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          notify('Archivo demasiado grande', 'El límite es de 5 MB.', 'error');
                          return;
                        }
                        setAttachmentFile(file);
                      }}
                    />
                  </label>
                )}
                <p className="mt-1.5 text-xs text-muted">
                  El archivo se sube de forma segura junto con tu ticket para ayudar al SAE a atender tu caso.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Link to={ROUTES.help}>
                <Button variant="secondary" fullWidth disabled={submitting}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" icon={Send} loading={submitting}>
                Registrar ticket
              </Button>
            </div>
          </Card>
        </form>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold">Qué sucede después</h2>
            <ol className="mt-3 space-y-4">
              <Step
                number="1"
                title="Registramos tu caso"
                description="Recibirás un código único de seguimiento al enviar el formulario."
              />
              <Step
                number="2"
                title="El SAE lo revisa"
                description="Se asigna a la categoría correspondiente según el SLA."
              />
              <Step
                number="3"
                title="Te respondemos"
                description="Verás la respuesta en el detalle del ticket y podrás continuar la conversación."
              />
            </ol>
          </Card>

          <Card className="bg-canvas">
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold">Tiempo de primera respuesta</h2>
                <p className="mt-1 text-sm text-muted">
                  {selectedCategory
                    ? `${selectedCategory.name}: hasta ${selectedCategory.slaHours} horas hábiles.`
                    : 'Depende de la categoría elegida (según el SLA configurado).'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold">¿Es una emergencia?</h2>
                <p className="mt-1 text-sm text-muted">
                  Si hay riesgo para personas, acude de inmediato a la garita de seguridad. No uses
                  este formulario para emergencias.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-xs text-muted">
            <TicketIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <p>
              Todos tus tickets quedan disponibles en "Mis tickets" con su estado actualizado y el
              historial de la conversación.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
        {number}
      </span>
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {title}
          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </li>
  );
}
