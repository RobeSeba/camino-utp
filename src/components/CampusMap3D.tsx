import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoute, getCampusSite, type MapPoint } from '@/lib/campus3d';
import { cn } from '@/lib/utils';

interface CampusMap3DProps {
  /** Puntos de la sede activa (acceso, pabellones y aula seleccionada). */
  points: MapPoint[];
  siteCode?: string;
  fromId: string;
  toId: string;
  onPick: (pointId: string) => void;
  className?: string;
  /** Cambia este valor para devolver la camara a la vista inicial. */
  resetSignal?: number;
}

interface Tokens {
  canvas: string;
  surface: string;
  elevated: string;
  line: string;
  ink: string;
  brand: string;
  brandSoft: string;
  successSoft: string;
  info: string;
  infoSoft: string;
}

interface Marker {
  group: THREE.Group;
  hit: THREE.Mesh;
  head: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  cone: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  label: THREE.Sprite;
  point: MapPoint;
}

interface MountState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  routeGroup: THREE.Group;
  markers: Map<string, Marker>;
  pickables: THREE.Object3D[];
  grid: THREE.GridHelper;
  materials: {
    ground: THREE.MeshStandardMaterial;
    walkway: THREE.MeshStandardMaterial;
    building: THREE.MeshStandardMaterial;
    patio: THREE.MeshStandardMaterial;
    entrance: THREE.MeshStandardMaterial;
    route: THREE.MeshStandardMaterial;
    dot: THREE.MeshBasicMaterial;
  };
  traveler: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  travelerCurve: THREE.CatmullRomCurve3 | null;
  tokens: Tokens;
  frame: number;
}

const WORLD_SCALE = 1.25;
const INITIAL_CAMERA = new THREE.Vector3(0, 95, 125);

function toWorldX(x: number): number {
  return (x - 50) * WORLD_SCALE;
}

function toWorldZ(y: number): number {
  return (y - 50) * WORLD_SCALE;
}

function readTokens(): Tokens {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    canvas: token('--c-canvas', '#f4f5f7'),
    surface: token('--c-surface', '#ffffff'),
    elevated: token('--c-elevated', '#ffffff'),
    line: token('--c-line', '#e3e6ec'),
    ink: token('--c-ink', '#101828'),
    brand: token('--c-brand', '#cf0a1e'),
    brandSoft: token('--c-brand-soft', '#fdecee'),
    successSoft: token('--c-success-soft', '#ecfdf3'),
    info: token('--c-info', '#175cd3'),
    infoSoft: token('--c-info-soft', '#eff8ff'),
  };
}

function prefersReducedMotion(): boolean {
  return (
    document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function makeLabel(text: string, tokens: Tokens): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    roundedRect(ctx, 6, 6, 308, 68, 22);
    ctx.fillStyle = tokens.elevated;
    ctx.fill();
    ctx.strokeStyle = tokens.line;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = '600 34px Inter, system-ui, sans-serif';
    ctx.fillStyle = tokens.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 42, 280);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(19, 4.75, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function disposeMaterial(material: THREE.Material) {
  const withMap = material as THREE.Material & { map?: THREE.Texture | null };
  withMap.map?.dispose();
  material.dispose();
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh & { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
}

/** La ruta reutiliza materiales compartidos: solo se liberan sus geometrias. */
function disposeGeometries(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
  });
}

function buildingHeight(point: MapPoint): number {
  return 9 + (point.floors ?? 2) * 4;
}

export function CampusMap3D({
  points,
  siteCode,
  fromId,
  toId,
  onPick,
  className,
  resetSignal = 0,
}: CampusMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<MountState | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Escena, controles y ciclo de renderizado.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tokens = readTokens();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(tokens.canvas);
    scene.fog = new THREE.Fog(tokens.canvas, 190, 330);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.copy(INITIAL_CAMERA);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'block h-full w-full touch-none';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !prefersReducedMotion();
    controls.dampingFactor = 0.08;
    controls.minDistance = 45;
    controls.maxDistance = 240;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.target.set(0, 0, 0);
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(tokens.canvas), 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(50, 90, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun);

    const materials: MountState['materials'] = {
      ground: new THREE.MeshStandardMaterial({ color: tokens.canvas, roughness: 1 }),
      walkway: new THREE.MeshStandardMaterial({ color: tokens.surface, roughness: 0.9 }),
      building: new THREE.MeshStandardMaterial({
        color: tokens.surface,
        roughness: 0.65,
        metalness: 0.05,
      }),
      patio: new THREE.MeshStandardMaterial({ color: tokens.successSoft, roughness: 1 }),
      entrance: new THREE.MeshStandardMaterial({ color: tokens.infoSoft, roughness: 0.8 }),
      route: new THREE.MeshStandardMaterial({
        color: tokens.brand,
        emissive: new THREE.Color(tokens.brand),
        emissiveIntensity: 0.35,
        roughness: 0.5,
      }),
      dot: new THREE.MeshBasicMaterial({ color: tokens.brand }),
    };

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(130, 26, tokens.line, tokens.line);
    grid.position.y = 0.03;
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.35;
    scene.add(grid);

    // Caminos y areas comunes de la sede activa.
    const entrancePoint = points.find((point) => point.kind === 'entrance');
    const patioPoint = points.find((point) => point.kind === 'patio');
    const entranceX = entrancePoint?.x ?? 50;
    const entranceY = entrancePoint?.y ?? 95;
    const corridorY = Math.min(88, entranceY - 11);
    const walkways: Array<[number, number, number, number]> = [
      [0, toWorldZ(corridorY), 105, 5.5],
      [
        toWorldX(entranceX),
        toWorldZ((corridorY + entranceY) / 2),
        5.5,
        Math.max(12, entranceY - corridorY + 8),
      ],
    ];
    walkways.forEach(([x, z, width, depth]) => {
      const walkway = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, depth), materials.walkway);
      walkway.position.set(x, 0.14, z);
      walkway.receiveShadow = true;
      scene.add(walkway);
    });

    if (patioPoint) {
      const patio = new THREE.Mesh(
        new THREE.CylinderGeometry(11, 11, 0.6, 40),
        materials.patio,
      );
      patio.position.set(toWorldX(patioPoint.x), 0.32, toWorldZ(patioPoint.y));
      patio.receiveShadow = true;
      scene.add(patio);
    }

    if (entrancePoint) {
      const entrance = new THREE.Mesh(new THREE.BoxGeometry(17, 0.7, 5), materials.entrance);
      entrance.position.set(toWorldX(entrancePoint.x), 0.4, toWorldZ(entrancePoint.y));
      entrance.castShadow = true;
      scene.add(entrance);
    }

    // Pabellones de la sede activa.
    points.forEach((point) => {
      if (point.kind !== 'building') return;
      const height = buildingHeight(point);
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(24, height, 20),
        materials.building,
      );
      building.position.set(toWorldX(point.x), height / 2, toWorldZ(point.y));
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(building.geometry),
        new THREE.LineBasicMaterial({ color: tokens.line, transparent: true, opacity: 0.8 }),
      );
      building.add(edges);
    });

    const routeGroup = new THREE.Group();
    scene.add(routeGroup);

    const traveler = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), materials.dot);
    traveler.visible = false;
    scene.add(traveler);

    const markers = new Map<string, Marker>();
    const mount: MountState = {
      scene,
      camera,
      renderer,
      controls,
      routeGroup,
      markers,
      pickables: [],
      grid,
      materials,
      traveler,
      travelerCurve: null,
      tokens,
      frame: 0,
    };
    mountRef.current = mount;

    // Seleccion de puntos con clic/touch (sin interferir con el arrastre de la camara).
    let pointerStart = { x: 0, y: 0, time: 0 };
    const handlePointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
    };
    const handlePointerUp = (event: PointerEvent) => {
      const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      if (moved > 7 || performance.now() - pointerStart.time > 500) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObjects(mount.pickables, false);
      if (hit?.object.userData.pointId) {
        onPickRef.current(hit.object.userData.pointId as string);
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // El tema puede cambiar mientras el modal esta abierto.
    const themeObserver = new MutationObserver(() => {
      const next = readTokens();
      Object.assign(mount.tokens, next);
      scene.background = new THREE.Color(next.canvas);
      scene.fog = new THREE.Fog(next.canvas, 190, 330);
      materials.ground.color.set(next.canvas);
      materials.walkway.color.set(next.surface);
      materials.building.color.set(next.surface);
      materials.patio.color.set(next.successSoft);
      materials.entrance.color.set(next.infoSoft);
      materials.route.color.set(next.brand);
      materials.route.emissive.set(next.brand);
      materials.dot.color.set(next.brand);
      controls.enableDamping = !prefersReducedMotion();
      const gridMat = grid.material as THREE.LineBasicMaterial;
      gridMat.color.set(next.line);
      mount.markers.forEach((marker) => {
        marker.group.remove(marker.label);
        disposeMaterial(marker.label.material as THREE.SpriteMaterial);
        marker.label = makeLabel(marker.point.shortLabel, next);
        marker.group.add(marker.label);
      });
      traveler.visible = Boolean(mount.travelerCurve) && !prefersReducedMotion();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-contrast', 'data-motion'],
    });

    const clock = new THREE.Clock();
    const animate = () => {
      mount.frame = requestAnimationFrame(animate);
      controls.update();
      if (mount.travelerCurve && traveler.visible) {
        const t = (clock.getElapsedTime() * 0.12) % 1;
        traveler.position.copy(mount.travelerCurve.getPointAt(t));
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(mount.frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      mountRef.current = null;
    };
    // La escena se reconstruye al cambiar de sede (distintos pabellones y alturas).
  }, [siteCode]);

  // Puntos seleccionables y ruta segun origen/destino.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const { tokens } = mount;
    const activeIds = new Set(points.map((point) => point.id));

    mount.markers.forEach((marker, id) => {
      if (activeIds.has(id)) return;
      marker.group.removeFromParent();
      disposeObject(marker.group);
      mount.markers.delete(id);
    });

    points.forEach((point) => {
      if (mount.markers.has(point.id)) return;
      const group = new THREE.Group();
      group.position.set(toWorldX(point.x), 0, toWorldZ(point.y));
      const baseY = point.kind === 'building' || point.kind === 'classroom'
        ? buildingHeight(point) + 0.5
        : 2;

      const pinMaterial = new THREE.MeshStandardMaterial({
        color: tokens.ink,
        roughness: 0.35,
        emissive: new THREE.Color(tokens.brandSoft),
        emissiveIntensity: 0.5,
      });
      const head = new THREE.Mesh(new THREE.SphereGeometry(2, 18, 14), pinMaterial);
      head.position.y = baseY + 5;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4, 16), pinMaterial);
      cone.position.y = baseY + 1.8;
      cone.rotation.x = Math.PI;

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(5, 0.5, 8, 32),
        new THREE.MeshBasicMaterial({ color: tokens.brand, transparent: true, opacity: 0.9 }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.45;
      ring.visible = false;

      // Area invisible mas grande para que el toque sea comodo en movil.
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(7, 12, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.position.y = baseY + 3;
      hit.userData.pointId = point.id;

      const label = makeLabel(point.shortLabel, tokens);
      label.position.y = baseY + 10;

      group.add(ring, cone, head, hit, label);
      mount.scene.add(group);
      mount.markers.set(point.id, { group, hit, head, cone, ring, label, point });
    });

    mount.pickables = Array.from(mount.markers.values()).map((marker) => marker.hit);

    const route = buildRoute(
      points.find((point) => point.id === fromId) ?? points[0],
      points.find((point) => point.id === toId) ?? points[points.length - 1],
    );
    disposeGeometries(mount.routeGroup);
    mount.routeGroup.clear();

    const curvePoints = route.waypoints.map(
      (point) => new THREE.Vector3(toWorldX(point.x), 1.6, toWorldZ(point.y)),
    );
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal', 0.1);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(24, curvePoints.length * 18), 0.6, 8, false),
      mount.materials.route,
    );
    mount.routeGroup.add(tube);
    curvePoints.forEach((position) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), mount.materials.dot);
      dot.position.copy(position);
      mount.routeGroup.add(dot);
    });

    mount.travelerCurve = curve;
    mount.traveler.visible = !prefersReducedMotion();

    mount.markers.forEach((marker, id) => {
      const isOrigin = id === fromId;
      const isDestination = id === toId;
      const active = isOrigin || isDestination;
      const color = isOrigin ? tokens.info : tokens.brand;
      marker.head.material.color.set(active ? color : tokens.ink);
      marker.cone.material.color.set(active ? color : tokens.ink);
      marker.head.material.emissiveIntensity = active ? 0.55 : 0.25;
      marker.ring.visible = active;
      marker.ring.material.color.set(color);
      marker.group.scale.setScalar(active ? 1.12 : 1);
    });
  }, [points, fromId, toId]);

  // Boton de "restablecer vista" del modal.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || resetSignal === 0) return;
    mount.camera.position.copy(INITIAL_CAMERA);
    mount.controls.target.set(0, 0, 0);
    mount.controls.update();
  }, [resetSignal]);

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full overflow-hidden', className)}
      role="application"
      aria-label={`Mapa 3D interactivo de ${getCampusSite(siteCode).name}. Arrastra para girar y toca un punto para seleccionarlo.`}
    />
  );
}
