import { lazy, Suspense, useState } from 'react';
import { Box } from 'lucide-react';
import type { Classroom } from '@/types';
import { DEFAULT_SITE_CODE, getCampusSite, SITE_LAYOUTS } from '@/lib/campus3d';
import { Spinner } from './ui/Spinner';
import { cn } from '@/lib/utils';

// Three.js se descarga solo cuando se abre el visor.
const InteractiveMapModal = lazy(() =>
  import('./InteractiveMapModal').then((module) => ({ default: module.InteractiveMapModal })),
);

interface CampusMapProps {
  classroom?: Classroom | null;
  className?: string;
  compact?: boolean;
}

/**
 * Mapa esquematico de la sede del aula. No usa coordenadas reales: sirve como
 * referencia visual hasta contar con los planos oficiales.
 */
export function CampusMap({ classroom, className, compact = false }: CampusMapProps) {
  const siteCode = classroom?.siteCode || DEFAULT_SITE_CODE;
  const site = getCampusSite(siteCode);
  const layout = SITE_LAYOUTS[siteCode] ?? SITE_LAYOUTS.CENTRAL;
  const shapes = layout.buildings.map((building) => ({
    code: building.code,
    x: Math.max(5, building.x - 13),
    y: Math.max(5, building.y - 10),
    width: 26,
    height: 20,
  }));
  const x = classroom?.mapX ?? layout.patio.x;
  const y = classroom?.mapY ?? layout.patio.y;
  const [show3D, setShow3D] = useState(false);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-line bg-canvas',
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={
          classroom
            ? `Mapa esquemático de ${site.name} con la ubicación del aula ${classroom.code}`
            : `Mapa esquemático de ${site.name}`
        }
        className="h-full w-full"
      >
        <defs>
          <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="var(--c-line)" strokeWidth="0.25" />
          </pattern>
        </defs>

        <rect width="100" height="100" fill="url(#grid)" />

        {/* Zonas verdes y patio */}
        <circle cx={layout.patio.x} cy={layout.patio.y} r="9" fill="var(--c-success-soft)" />
        <text
          x={layout.patio.x}
          y={layout.patio.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="3"
          fill="var(--c-success)"
        >
          Patio
        </text>

        {shapes.map((building) => {
          const isActive =
            classroom?.buildingCode === building.code ||
            classroom?.buildingName.trim().endsWith(` ${building.code}`);
          return (
            <g key={building.code}>
              <rect
                x={building.x}
                y={building.y}
                width={building.width}
                height={building.height}
                rx="3"
                fill={isActive ? 'var(--c-brand-soft)' : 'var(--c-surface)'}
                stroke={isActive ? 'var(--c-brand)' : 'var(--c-line)'}
                strokeWidth={isActive ? 1.2 : 0.7}
              />
              <text
                x={building.x + building.width / 2}
                y={building.y + building.height / 2 + 1}
                textAnchor="middle"
                fontSize="5"
                fontWeight="700"
                fill={isActive ? 'var(--c-brand)' : 'var(--c-muted)'}
              >
                {building.code}
              </text>
            </g>
          );
        })}

        {/* Entrada */}
        <g>
          <rect
            x={layout.entrance.x - 10}
            y={layout.entrance.y - 2}
            width="20"
            height="5"
            rx="2.5"
            fill="var(--c-info-soft)"
            stroke="var(--c-info)"
            strokeWidth="0.6"
          />
          <text
            x={layout.entrance.x}
            y={layout.entrance.y + 1.6}
            textAnchor="middle"
            fontSize="2.8"
            fill="var(--c-info)"
          >
            Entrada
          </text>
        </g>

        {/* Ruta sugerida */}
        {classroom && (
          <>
            <polyline
              points={`${layout.entrance.x},${layout.entrance.y} ${layout.entrance.x},84 ${Math.min(92, Math.max(8, x))},84 ${Math.min(92, Math.max(8, x))},${y}`}
              fill="none"
              stroke="var(--c-brand)"
              strokeWidth="1"
              strokeDasharray="2.5 1.8"
              strokeLinecap="round"
            />
            <circle cx={x} cy={y} r="5" fill="var(--c-brand)" opacity="0.18" />
            <circle cx={x} cy={y} r="2.6" fill="var(--c-brand)" stroke="var(--c-surface)" strokeWidth="1" />
            {!compact && (
              <text
                x={Math.min(88, Math.max(12, x))}
                y={Math.max(8, y - 7)}
                textAnchor="middle"
                fontSize="3.4"
                fontWeight="700"
                fill="var(--c-brand)"
              >
                {classroom.code}
              </text>
            )}
          </>
        )}
      </svg>

      {classroom && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted shadow-sm backdrop-blur">
          <span className="truncate">{site.shortName} · {classroom.buildingName}</span>
          <span className="shrink-0 text-ink">Piso {classroom.floor}</span>
        </div>
      )}

      {/* Toda la vista previa es un boton: clic en PC / touch en movil abre el visor 3D. */}
      <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-lg bg-elevated/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand shadow-sm backdrop-blur">
        <Box className="h-3 w-3" aria-hidden="true" />
        3D
      </span>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-brand/0 opacity-0 transition group-hover:bg-brand/5 group-hover:opacity-100">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated/95 px-3 py-1.5 text-xs font-semibold text-brand shadow-sm">
          <Box className="h-3.5 w-3.5" aria-hidden="true" />
          Ver en 3D
        </span>
      </div>
      <button
        type="button"
        onClick={() => setShow3D(true)}
        aria-label="Abrir mapa 3D interactivo"
        aria-haspopup="dialog"
        title="Abrir mapa 3D interactivo"
        className="absolute inset-0 z-20 h-full w-full rounded-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      />

      {show3D && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 text-sm text-white">
              <Spinner className="h-5 w-5" />
              <span className="ml-3">Cargando mapa 3D…</span>
            </div>
          }
        >
          <InteractiveMapModal
            open={show3D}
            onClose={() => setShow3D(false)}
            classroom={classroom}
          />
        </Suspense>
      )}
    </div>
  );
}
