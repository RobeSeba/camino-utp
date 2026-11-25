import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, MapPoint } from '@/lib/campus3d';
import { CAMPUS_CENTER, pointToLatLng } from '@/lib/campus3d';
import { cn } from '@/lib/utils';

interface RealMapViewProps {
  points: MapPoint[];
  fromId: string;
  toId: string;
  path: LatLng[];
  onPick: (pointId: string) => void;
  className?: string;
}

function markerIcon(point: MapPoint, role: 'none' | 'from' | 'to'): L.DivIcon {
  const color =
    role === 'from'
      ? '#175cd3'
      : role === 'to'
        ? '#cf0a1e'
        : point.kind === 'site'
          ? '#cf0a1e'
          : point.kind === 'classroom'
            ? '#039855'
            : '#475467';
  return L.divIcon({
    className: 'campus-marker',
    html: `<span class="campus-marker__dot" style="--marker-color:${color}">${point.shortLabel}</span>`,
    iconSize: [110, 32],
    iconAnchor: [55, 16],
  });
}

export function RealMapView({ points, fromId, toId, path, onPick, className }: RealMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const lineRef = useRef<L.Polyline | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    points.forEach((point) => {
      const { lat, lng } = pointToLatLng(point);
      const marker = L.marker([lat, lng], {
        icon: markerIcon(point, 'none'),
        title: point.label,
        keyboard: true,
      }).addTo(map);
      marker.bindTooltip(point.label, { direction: 'top', offset: [0, -12] });
      marker.on('click', () => onPickRef.current(point.id));
      markersRef.current.set(point.id, marker);
    });

    lineRef.current = L.polyline([], {
      color: '#cf0a1e',
      weight: 5,
      opacity: 0.85,
      dashArray: '9 7',
      lineCap: 'round',
    }).addTo(map);

    map.fitBounds(
      L.latLngBounds(points.map((point) => {
        const { lat, lng } = pointToLatLng(point);
        return [lat, lng] as [number, number];
      })).pad(0.3),
      { maxZoom: 18 },
    );

    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      markersRef.current.clear();
      lineRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [points]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((marker, id) => {
      const point = points.find((item) => item.id === id);
      if (!point) return;
      marker.setIcon(markerIcon(point, id === fromId ? 'from' : id === toId ? 'to' : 'none'));
    });
    lineRef.current?.setLatLngs(path.map(({ lat, lng }) => [lat, lng] as [number, number]));
  }, [points, fromId, toId, path]);

  return (
    <div
      ref={containerRef}
      className={cn('h-full w-full', className)}
      role="application"
      aria-label="Mapa real de OpenStreetMap del campus UTP Lima Centro"
    />
  );
}
