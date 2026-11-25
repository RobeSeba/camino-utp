import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Clock,
  Globe2,
  MapPin,
  MousePointer2,
  Navigation,
  RotateCcw,
  X,
} from 'lucide-react';
import type { Classroom } from '@/types';
import { CampusMap3D } from './CampusMap3D';
import { RealMapView } from './RealMapView';
import { FloorPlanPanel } from './FloorPlanPanel';
import { Select } from './ui/Select';
import { fetchClassrooms } from '@/services/campus';
import {
  buildRoute,
  CAMPUS_SITES,
  DEFAULT_SITE_CODE,
  fallbackPath,
  fetchWalkingRoute,
  formatDistance,
  formatDuration,
  getCampusSite,
  getRealMapPoints,
  getSitePoints,
  type LiveRoute,
  type MapPoint,
} from '@/lib/campus3d';
import { cn } from '@/lib/utils';

interface InteractiveMapModalProps {
  open: boolean;
  onClose: () => void;
  classroom?: Classroom | null;
}

type ViewMode = '3d' | 'osm';

export function InteractiveMapModal({ open, onClose, classroom }: InteractiveMapModalProps) {
  const [siteCode, setSiteCode] = useState(classroom?.siteCode || DEFAULT_SITE_CODE);
  const [roomPoint, setRoomPoint] = useState<MapPoint | null>(null);
  const [fromId, setFromId] = useState(`entrada-${siteCode}`);
  const [toId, setToId] = useState(() => getSitePoints(siteCode).find((p) => p.kind === 'building')?.id ?? `site-${siteCode}`);
  const [pickMode, setPickMode] = useState<'origin' | 'destination'>('destination');
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [resetSignal, setResetSignal] = useState(0);
  const [isTouch, setIsTouch] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [liveRoute, setLiveRoute] = useState<LiveRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<MapPoint | null>(null);

  const site = getCampusSite(siteCode);
  const classroomForSite = classroom?.siteCode === siteCode ? classroom : null;
  const sitePoints = useMemo(
    () => getSitePoints(siteCode, classroomForSite),
    [siteCode, classroomForSite],
  );
  const points = useMemo(
    () => (roomPoint ? [...sitePoints.filter((point) => point.id !== roomPoint.id), roomPoint] : sitePoints),
    [sitePoints, roomPoint],
  );
  const realPoints = useMemo(() => {
    const base = getRealMapPoints(siteCode, classroomForSite);
    return roomPoint ? [...base.filter((point) => point.id !== roomPoint.id), roomPoint] : base;
  }, [siteCode, classroomForSite, roomPoint]);
  const siteOptions = useMemo(
    () => CAMPUS_SITES.map((item) => ({ value: item.code, label: item.name })),
    [],
  );
  const options = useMemo(
    () => points.map((point) => ({ value: point.id, label: point.label })),
    [points],
  );

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    if (!open) return;
    const initialSite = getCampusSite(classroom?.siteCode || DEFAULT_SITE_CODE);
    setSiteCode(initialSite.code);
    setFromId(`entrada-${initialSite.code}`);
    setToId(
      classroom
        ? `room-${classroom.code}`
        : getSitePoints(initialSite.code).find((point) => point.kind === 'building')?.id ?? `site-${initialSite.code}`,
    );
    setPickMode('destination');
    setViewMode('3d');
    setRoomPoint(null);
    setSelectedBuilding(null);
    setLiveRoute(null);
  }, [open, classroom]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void fetchClassrooms()
      .then((data) => {
        if (active) setClassrooms(data);
      })
      .catch(() => {
        // Sin conexion se usa el aula actual como respaldo del plano.
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const from = points.find((point) => point.id === fromId) ?? points[0];
  const to = points.find((point) => point.id === toId) ?? points[points.length - 1];
  const localRoute = buildRoute(from, to);

  useEffect(() => {
    if (!open || viewMode !== 'osm') return;
    let active = true;
    setRouteLoading(true);
    void fetchWalkingRoute(from, to).then((result) => {
      if (!active) return;
      setLiveRoute(result);
      setRouteLoading(false);
    });
    return () => {
      active = false;
    };
  }, [open, viewMode, from, to]);

  if (!open) return null;

  const displayRoute = viewMode === 'osm' && liveRoute
    ? liveRoute
    : { meters: localRoute.meters, seconds: localRoute.seconds, source: 'local' as const };
  const displayPath = viewMode === 'osm' ? (liveRoute?.path ?? fallbackPath(from, to)) : [];

  const changeSite = (code: string) => {
    if (code === siteCode) return;
    setSiteCode(code);
    setRoomPoint(null);
    setSelectedBuilding(null);
    setLiveRoute(null);
    setFromId(`entrada-${code}`);
    setToId(getSitePoints(code).find((point) => point.kind === 'building')?.id ?? `site-${code}`);
  };

  const handlePick = (pointId: string) => {
    const point = realPoints.find((item) => item.id === pointId);
    if (!point) return;
    if (point.kind === 'site') {
      changeSite(point.siteCode);
      return;
    }
    if (point.kind === 'building') {
      setSelectedBuilding(point);
      return;
    }
    if (pickMode === 'origin') {
      if (pointId === toId) setToId(fromId);
      setFromId(pointId);
    } else {
      if (pointId === fromId) setFromId(toId);
      setToId(pointId);
    }
  };

  const handleSelectRoom = (room: Classroom) => {
    const roomCode = room.siteCode || siteCode;
    const point = getSitePoints(roomCode, room).find((item) => item.id === `room-${room.code}`);
    if (!point) return;
    setSiteCode(roomCode);
    setRoomPoint(point);
    setToId(point.id);
    setSelectedBuilding(null);
  };

  const roomsForPanel = classrooms.length > 0 ? classrooms : classroom ? [classroom] : [];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-1.5 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map3d-title"
        className="relative flex h-[96dvh] w-full max-w-6xl animate-fade-in flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-float sm:h-[min(88dvh,820px)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="map3d-title" className="text-base font-semibold sm:text-lg">
              Mapa interactivo · UTP Lima Centro
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Sede activa: <strong className="font-semibold text-ink">{site.name}</strong> · {site.address}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-xl border border-line bg-canvas p-1"
              role="group"
              aria-label="Tipo de mapa"
            >
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                aria-pressed={viewMode === '3d'}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  viewMode === '3d' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                <Box className="h-3.5 w-3.5" aria-hidden="true" />
                Vista 3D
              </button>
              <button
                type="button"
                onClick={() => setViewMode('osm')}
                aria-pressed={viewMode === 'osm'}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  viewMode === 'osm' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                Mapa real
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Cerrar mapa"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:gap-3">
            <Select
              id="map3d-site"
              label="Sede"
              options={siteOptions}
              value={siteCode}
              onChange={(event) => changeSite(event.target.value)}
              className="h-10"
              containerClassName="min-w-0 flex-1"
            />
            <Select
              id="map3d-from"
              label="Desde"
              options={options}
              value={fromId}
              onChange={(event) => {
                if (event.target.value === toId) setToId(fromId);
                setFromId(event.target.value);
              }}
              className="h-10"
              containerClassName="min-w-0 flex-1"
            />
            <Select
              id="map3d-to"
              label="Hasta"
              options={options}
              value={toId}
              onChange={(event) => {
                if (event.target.value === fromId) setFromId(toId);
                setToId(event.target.value);
              }}
              className="h-10"
              containerClassName="min-w-0 flex-1"
            />
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex rounded-xl border border-line bg-canvas p-1" role="group" aria-label="Qué punto seleccionar al tocar el mapa">
              <button
                type="button"
                onClick={() => setPickMode('origin')}
                aria-pressed={pickMode === 'origin'}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  pickMode === 'origin'
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink',
                )}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Origen
              </button>
              <button
                type="button"
                onClick={() => setPickMode('destination')}
                aria-pressed={pickMode === 'destination'}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  pickMode === 'destination'
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink',
                )}
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                Destino
              </button>
            </div>

            <div
              className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-brand-ink"
              role="status"
              aria-live="polite"
            >
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-lg font-bold leading-none">
                {formatDuration(displayRoute.seconds)}
              </span>
              <span className="text-xs font-medium opacity-80">
                {formatDistance(displayRoute.meters)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-canvas">
          {viewMode === '3d' ? (
            <CampusMap3D
              points={points}
              siteCode={siteCode}
              fromId={fromId}
              toId={toId}
              onPick={handlePick}
              resetSignal={resetSignal}
              className="h-full w-full"
            />
          ) : (
            <RealMapView
              points={realPoints}
              fromId={fromId}
              toId={toId}
              path={displayPath}
              onPick={handlePick}
              className="h-full w-full"
            />
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2 sm:bottom-4 sm:left-4">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-elevated/90 px-2.5 py-1.5 text-[11px] font-medium text-muted shadow-sm backdrop-blur">
              <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
              {viewMode === '3d'
                ? isTouch
                  ? 'Desliza para girar · Pellizca para acercar · Toca un pabellón para ver sus pisos'
                  : 'Arrastra para girar · Rueda para acercar · Clic en un pabellón para ver sus pisos'
                : 'Toca otra sede para cambiar · Toca un pabellón para ver sus pisos'}
            </span>
          </div>

          {viewMode === '3d' && (
            <button
              type="button"
              onClick={() => setResetSignal((value) => value + 1)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-elevated/90 px-2.5 py-2 text-xs font-semibold text-ink shadow-sm backdrop-blur transition hover:bg-elevated sm:right-4 sm:top-4"
              aria-label="Restablecer vista del mapa"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Centrar vista</span>
            </button>
          )}

          {selectedBuilding && (
            <div className="absolute inset-x-0 bottom-0 z-30 max-h-[78%] animate-slide-up overflow-hidden rounded-t-2xl border-t border-line shadow-float sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-96 sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0">
              <FloorPlanPanel
                building={selectedBuilding}
                classrooms={roomsForPanel}
                selectedCode={to.kind === 'classroom' ? to.shortLabel : undefined}
                onSelectRoom={handleSelectRoom}
                onClose={() => setSelectedBuilding(null)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[11px] text-muted sm:px-5">
          <p>
            Ruta en <strong className="font-semibold text-ink">{site.name}</strong>: desde{' '}
            <strong className="font-semibold text-ink">{from.label}</strong> hasta{' '}
            <strong className="font-semibold text-ink">{to.label}</strong>.{' '}
            {viewMode === 'osm' && (
              <span className="font-semibold text-brand-ink">
                {routeLoading
                  ? 'Calculando ruta con OSRM…'
                  : displayRoute.source === 'osrm'
                    ? 'Ruta peatonal OSRM + tiempo de pisos.'
                    : 'Estimación local (OSRM no disponible).'}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="hidden shrink-0 rounded-lg px-3 py-1.5 font-semibold text-brand transition hover:bg-brand-soft sm:inline-flex"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
