import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';

type Product3DViewerProps = {
  name: string;
  image: string;
  frames?: string[];
  compact?: boolean;
};

type Rotation = { turn: number; pitch: number };
type Point = { x: number; y: number };
type PreloadState = 'idle' | 'loading' | 'ready';

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startTurn: number;
  startPitch: number;
  startPan: Point;
  lastX: number;
  lastTime: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (value: number, max: number) => ((value % max) + max) % max;
const MAX_ZOOM = 2.7;
const MIN_ZOOM = 1;

export default function Product3DViewer({ name, image, frames = [], compact = false }: Product3DViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef({ distance: 0, zoom: 1, center: { x: 0, y: 0 }, pan: { x: 0, y: 0 } as Point });
  const turnRef = useRef(0);
  const pitchRef = useRef(-1);
  const zoomRef = useRef(1);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  const inertiaFrameRef = useRef<number | null>(null);
  const rotationFrameRef = useRef<number | null>(null);
  const pendingRotationRef = useRef<{ turn: number; pitch: number } | null>(null);
  const [rotation, setRotation] = useState<Rotation>({ turn: 0, pitch: -1 });
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameBlend, setFrameBlend] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const [preloadState, setPreloadState] = useState<PreloadState>(frames.length > 1 ? 'idle' : 'ready');
  const [fullscreen, setFullscreen] = useState(false);
  const frameKey = frames.join('|');

  useEffect(() => {
    const element = viewerRef.current;
    if (!element || frames.length <= 1 || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '180px 0px', threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [frameKey, frames.length]);

  useEffect(() => {
    if (!visible || frames.length <= 1) return;
    let cancelled = false;
    let loaded = 0;
    setPreloadState('loading');
    frames.forEach(src => {
      const preload = new Image();
      preload.decoding = 'async';
      const onComplete = () => {
        loaded += 1;
        if (loaded === frames.length && !cancelled) setPreloadState('ready');
      };
      preload.onload = onComplete;
      preload.onerror = onComplete;
      preload.src = src;
    });
    return () => { cancelled = true; };
  }, [frameKey, visible]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => () => {
    if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current);
    if (rotationFrameRef.current !== null) cancelAnimationFrame(rotationFrameRef.current);
  }, []);

  const commitRotation = (turn: number, pitch: number) => {
    const nextTurn = wrap(turn, 360);
    const nextPitch = clamp(pitch, -10, 10);
    turnRef.current = nextTurn;
    pitchRef.current = nextPitch;
    setRotation({ turn: nextTurn, pitch: nextPitch });
    if (frames.length > 1) {
      const framePosition = (nextTurn / 360) * frames.length;
      const baseFrame = Math.floor(framePosition);
      setFrameIndex(baseFrame % frames.length);
      setFrameBlend(framePosition - baseFrame);
    }
  };

  const commitZoom = (nextZoom: number, nextPan = panRef.current) => {
    const safeZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const maxPan = (safeZoom - 1) * 210;
    const safePan = safeZoom === MIN_ZOOM
      ? { x: 0, y: 0 }
      : { x: clamp(nextPan.x, -maxPan, maxPan), y: clamp(nextPan.y, -maxPan, maxPan) };
    zoomRef.current = safeZoom;
    panRef.current = safePan;
    setZoom(safeZoom);
    setPan(safePan);
  };

  const stopInertia = () => {
    if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
  };

  const scheduleRotation = (turn: number, pitch: number) => {
    pendingRotationRef.current = { turn, pitch };
    if (rotationFrameRef.current !== null) return;
    rotationFrameRef.current = requestAnimationFrame(() => {
      rotationFrameRef.current = null;
      const pending = pendingRotationRef.current;
      pendingRotationRef.current = null;
      if (pending) commitRotation(pending.turn, pending.pitch);
    });
  };

  const runInertia = () => {
    velocityRef.current *= 0.9;
    if (Math.abs(velocityRef.current) < 0.02) {
      inertiaFrameRef.current = null;
      return;
    }
    commitRotation(turnRef.current + velocityRef.current, pitchRef.current);
    inertiaFrameRef.current = requestAnimationFrame(runInertia);
  };

  const getPinchValues = () => {
    const points = Array.from(pointersRef.current.values());
    const first = points[0];
    const second = points[1];
    if (!first || !second) return null;
    return {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    stopInertia();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startTurn: turnRef.current, startPitch: pitchRef.current, startPan: panRef.current, lastX: event.clientX, lastTime: performance.now() };
      velocityRef.current = 0;
    } else if (pointersRef.current.size === 2) {
      const pinch = getPinchValues();
      if (pinch) pinchRef.current = { distance: pinch.distance, zoom: zoomRef.current, center: pinch.center, pan: panRef.current };
    }
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      const pinch = getPinchValues();
      if (!pinch || pinchRef.current.distance <= 0) return;
      const ratio = pinch.distance / pinchRef.current.distance;
      const nextZoom = clamp(pinchRef.current.zoom * ratio, MIN_ZOOM, MAX_ZOOM);
      commitZoom(nextZoom, { x: pinchRef.current.pan.x + pinch.center.x - pinchRef.current.center.x, y: pinchRef.current.pan.y + pinch.center.y - pinchRef.current.center.y });
      return;
    }
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const timeDelta = Math.max(8, now - dragRef.current.lastTime);
    const viewerWidth = Math.max(viewerRef.current?.clientWidth ?? 360, 320);
    const turnPerPixel = 180 / viewerWidth;
    velocityRef.current = (((event.clientX - dragRef.current.lastX) * 0.95) / timeDelta) * 16 * turnPerPixel;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastTime = now;
    if (zoomRef.current > 1.08 && Math.abs(dy) > Math.abs(dx) * 0.8) {
      commitZoom(zoomRef.current, { x: dragRef.current.startPan.x + dx, y: dragRef.current.startPan.y + dy });
      return;
    }
    scheduleRotation(dragRef.current.startTurn + dx * turnPerPixel, dragRef.current.startPitch - dy * 0.1);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setDragging(false);
      inertiaFrameRef.current = requestAnimationFrame(runInertia);
    } else if (pointersRef.current.size === 1) {
      const [pointerId, point] = Array.from(pointersRef.current.entries())[0];
      dragRef.current = { pointerId, startX: point.x, startY: point.y, startTurn: turnRef.current, startPitch: pitchRef.current, startPan: panRef.current, lastX: point.x, lastTime: performance.now() };
    }
  };

  const resetView = (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    stopInertia();
    velocityRef.current = 0;
    commitRotation(0, -1);
    commitZoom(1, { x: 0, y: 0 });
  };

  const zoomBy = (amount: number, event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    commitZoom(zoomRef.current + amount);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    commitZoom(zoomRef.current + (event.deltaY < 0 ? 0.16 : -0.16));
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    commitZoom(zoomRef.current > 1.05 ? 1 : 2.1, { x: 0, y: 0 });
  };

  const toggleFullscreen = async (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    if (!viewerRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewerRef.current.requestFullscreen();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === '+' || event.key === '=') return zoomBy(0.2, event);
    if (event.key === '-' || event.key === '_') return zoomBy(-0.2, event);
    if (event.key === '0') return resetView(event);
    if (event.key === 'f' || event.key === 'F') return void toggleFullscreen(event);
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') return resetView(event);
    const turnStep = event.shiftKey ? 30 : 12;
    commitRotation(turnRef.current + (event.key === 'ArrowLeft' ? -turnStep : event.key === 'ArrowRight' ? turnStep : 0), pitchRef.current + (event.key === 'ArrowUp' ? -4 : event.key === 'ArrowDown' ? 4 : 0));
  };

  const activeImage = visible ? (frames[frameIndex] ?? image) : image;
  const nextFrameIndex = frames.length > 1 ? (frameIndex + 1) % frames.length : frameIndex;
  const nextImage = visible ? (frames[nextFrameIndex] ?? activeImage) : activeImage;
  const angleRadians = (rotation.turn * Math.PI) / 180;
  const visualYaw = Math.sin(angleRadians) * 5;
  const angle = Math.round(rotation.turn);
  const viewLabel = frames.length > 1 ? `360° / ${String(frameIndex + 1).padStart(2, '0')} of ${frames.length}` : '360° view';

  return (
    <div
      ref={viewerRef}
      role="group"
      tabIndex={0}
      aria-label={`${name} 360 degree product viewer. Drag left or right to rotate, pinch or wheel to zoom, and double click to toggle zoom.`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={`product-viewer relative h-full w-full overflow-hidden bg-[#f8f8f6] outline-none ${dragging ? 'is-dragging' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <div className="product-viewer__surface relative h-full w-full">
        <div className="product-viewer__media absolute inset-0 grid place-items-center p-3 sm:p-5">
          <img src={activeImage} alt={name} draggable={false} decoding="async" loading={visible && frameIndex === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-contain brightness-110" style={{ opacity: 1 - frameBlend, transform: `perspective(1100px) translate3d(${pan.x}px, ${pan.y}px, 0) rotateX(${rotation.pitch}deg) rotateY(${visualYaw}deg) scale(${zoom * (dragging ? 1.025 : 1.015)})`, transition: dragging ? 'none' : 'transform 180ms cubic-bezier(.23,1,.32,1)' }} />
          {frames.length > 1 && <img src={nextImage} alt="" aria-hidden="true" draggable={false} decoding="async" loading="lazy" className="absolute inset-0 h-full w-full object-contain brightness-110" style={{ opacity: frameBlend, transform: `perspective(1100px) translate3d(${pan.x}px, ${pan.y}px, 0) rotateX(${rotation.pitch}deg) rotateY(${visualYaw}deg) scale(${zoom * (dragging ? 1.025 : 1.015)})`, transition: dragging ? 'none' : 'transform 180ms cubic-bezier(.23,1,.32,1)' }} />}
        </div>
        <div className="product-viewer__shine pointer-events-none absolute inset-0" />
        <div className="product-viewer__depth pointer-events-none absolute inset-x-[12%] bottom-[7%] h-[12%] rounded-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12 text-[9px] font-bold uppercase tracking-[.14em] text-white/80">
        <span>{compact ? 'Swipe to rotate' : 'Drag to rotate'}</span>
        <span className="text-[#d4a94d]">{viewLabel} · {angle}°</span>
      </div>
      {visible && frames.length > 1 && preloadState !== 'ready' && <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[8px] font-bold uppercase tracking-[.16em] text-white/75 backdrop-blur">Loading 360°</div>}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur">
        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => zoomBy(-0.2, event)} aria-label={`Zoom out ${name}`} className="rounded-full p-2 text-white/75 transition hover:text-[#d4a94d] disabled:opacity-30" disabled={zoom <= MIN_ZOOM}><Minus size={13} /></button>
        <span className="min-w-10 text-center text-[9px] font-bold uppercase tracking-[.12em] text-white/70">{Math.round(zoom * 100)}%</span>
        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => zoomBy(0.2, event)} aria-label={`Zoom in ${name}`} className="rounded-full p-2 text-white/75 transition hover:text-[#d4a94d] disabled:opacity-30" disabled={zoom >= MAX_ZOOM}><Plus size={13} /></button>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur">
        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => toggleFullscreen(event)} aria-label={`${fullscreen ? 'Exit' : 'Enter'} fullscreen for ${name}`} className="rounded-full p-2 text-white/75 transition hover:text-[#d4a94d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a94d]"><Maximize2 size={13} /></button>
        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={resetView} aria-label={`Reset ${name} 360 view`} className="rounded-full p-2 text-white/75 transition hover:text-[#d4a94d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a94d]"><RotateCcw size={13} /></button>
      </div>
    </div>
  );
}
