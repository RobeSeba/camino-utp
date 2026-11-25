import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Layers, X } from 'lucide-react';
import type { Classroom } from '@/types';
import type { MapPoint } from '@/lib/campus3d';
import { resolveFloor } from '@/lib/campus3d';
import { cn } from '@/lib/utils';

interface FloorPlanPanelProps {
  building: MapPoint;
  classrooms: Classroom[];
  selectedCode?: string;
  onSelectRoom: (classroom: Classroom) => void;
  onClose: () => void;
}

export function FloorPlanPanel({
  building,
  classrooms,
  selectedCode,
  onSelectRoom,
  onClose,
}: FloorPlanPanelProps) {
  const rooms = useMemo(
    () =>
      classrooms.filter((item) => {
        const sameSite = !building.siteCode || item.siteCode === building.siteCode;
        if (!sameSite) return false;
        return (
          item.code.toUpperCase().startsWith(`${building.id}-`) ||
          item.buildingCode === building.id ||
          item.buildingName.trim().endsWith(` ${building.id}`)
        );
      }),
    [classrooms, building.id, building.siteCode],
  );

  const floors = useMemo(
    () =>
      Array.from(new Set(rooms.map((item) => resolveFloor(item.code, item.floor)))).sort(
        (a, b) => a - b,
      ),
    [rooms],
  );

  const initialFloor = useMemo(() => {
    const selected = rooms.find((item) => item.code === selectedCode);
    return selected ? resolveFloor(selected.code, selected.floor) : floors[0] ?? 1;
  }, [rooms, selectedCode, floors]);

  const [floor, setFloor] = useState(initialFloor);

  useEffect(() => {
    setFloor(initialFloor);
  }, [initialFloor, building.id, building.siteCode]);

  const roomsOnFloor = rooms.filter((item) => resolveFloor(item.code, item.floor) === floor);
  const topRow = roomsOnFloor.filter((_, index) => index % 2 === 0);
  const bottomRow = roomsOnFloor.filter((_, index) => index % 2 === 1);

  const renderRoom = (classroom: Classroom) => {
    const active = classroom.code === selectedCode;
    return (
      <button
        key={classroom.id}
        type="button"
        onClick={() => onSelectRoom(classroom)}
        className={cn(
          'flex min-h-14 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition',
          active
            ? 'border-brand bg-brand text-white shadow-sm'
            : 'border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft',
        )}
      >
        <span className="text-sm font-bold">{classroom.code}</span>
        <span className={cn('text-[10px]', active ? 'text-white/80' : 'text-muted')}>
          {classroom.capacity || '—'} pers.
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col bg-elevated">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-4 w-4 text-brand" aria-hidden="true" />
            {building.label}
          </h3>
          <p className="mt-0.5 text-xs text-muted">Plano esquemático por piso</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
          aria-label="Cerrar plano del pabellón"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Seleccionar piso">
            {floors.length > 0 ? (
              floors.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFloor(option)}
                  aria-pressed={floor === option}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                    floor === option
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-surface text-muted hover:border-brand hover:text-brand',
                  )}
                >
                  Piso {option}
                </button>
              ))
            ) : (
              <span className="text-xs text-muted">Sin pisos registrados</span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-canvas p-3">
          <div className="grid grid-cols-2 gap-2">{topRow.map(renderRoom)}</div>
          <div className="my-2 flex h-5 items-center justify-center rounded bg-brand-soft text-[10px] font-semibold uppercase tracking-wider text-brand-ink">
            Pasillo
          </div>
          <div className="grid grid-cols-2 gap-2">{bottomRow.map(renderRoom)}</div>
          {roomsOnFloor.length === 0 && (
            <p className="py-6 text-center text-xs text-muted">
              No hay aulas registradas en el piso {floor}.
            </p>
          )}
        </div>

        {selectedCode && (
          <button
            type="button"
            onClick={() => {
              const room = rooms.find((item) => item.code === selectedCode);
              if (room) onSelectRoom(room);
            }}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Calcular tiempo hasta {selectedCode}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
          El piso se obtiene del primer número del código: <strong>A-201</strong> es piso 2,{' '}
          <strong>B-305</strong> es piso 3. Toca un salón para usarlo como destino.
        </p>
      </div>
    </div>
  );
}
