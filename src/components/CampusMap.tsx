import type { Classroom } from '@/types';
import { cn } from '@/lib/utils';

interface CampusMapProps {
  classroom?: Classroom | null;
  className?: string;
  compact?: boolean;
}

const BUILDING_SHAPES = [
  { code: 'A', x: 12, y: 18, width: 26, height: 30 },
  { code: 'B', x: 52, y: 22, width: 28, height: 26 },
  { code: 'C', x: 14, y: 60, width: 30, height: 26 },
  { code: 'D', x: 58, y: 62, width: 28, height: 24 },
];

/**
 * Mapa esquematico del campus. No usa coordenadas reales: sirve como
 * referencia visual hasta contar con los planos oficiales (ver Etapa 1).
 */
export function CampusMap({ classroom, className, compact = false }: CampusMapProps) {
  const x = classroom?.mapX ?? 50;
  const y = classroom?.mapY ?? 50;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line bg-canvas',
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={
          classroom
            ? `Mapa esquemático del campus con la ubicación del aula ${classroom.code}`
            : 'Mapa esquemático del campus'
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
        <circle cx="44" cy="50" r="9" fill="var(--c-success-soft)" />
        <text x="44" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="3" fill="var(--c-success)">
          Patio
        </text>

        {BUILDING_SHAPES.map((building) => {
          const isActive = classroom?.buildingName.endsWith(` ${building.code}`);
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
          <rect x="40" y="93" width="20" height="5" rx="2.5" fill="var(--c-info-soft)" stroke="var(--c-info)" strokeWidth="0.6" />
          <text x="50" y="96.6" textAnchor="middle" fontSize="2.8" fill="var(--c-info)">
            Entrada
          </text>
        </g>

        {/* Ruta sugerida */}
        {classroom && (
          <>
            <polyline
              points={`50,93 50,84 ${Math.min(92, Math.max(8, x))},84 ${Math.min(92, Math.max(8, x))},${y}`}
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
          <span className="truncate">{classroom.buildingName}</span>
          <span className="shrink-0 text-ink">Piso {classroom.floor}</span>
        </div>
      )}
    </div>
  );
}
