import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

type Product3DViewerProps = {
  name: string;
  image: string;
  frames?: string[];
  compact?: boolean;
};

type Rotation = { turn: number; pitch: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (value: number, max: number) => ((value % max) + max) % max;

export default function Product3DViewer({ name, image, frames = [], compact = false }: Product3DViewerProps) {
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, startTurn: 0, startPitch: 0, lastX: 0, lastTime: 0 });
  const turnRef = useRef(0);
  const pitchRef = useRef(-1);
  const velocityRef = useRef(0);
  const inertiaFrameRef = useRef<number | null>(null);
  const [rotation, setRotation] = useState<Rotation>({ turn: 0, pitch: -1 });
  const [frameIndex, setFrameIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    frames.forEach(src => {
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = src;
    });
    return () => {
      if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current);
    };
  }, [frames]);

  const commitRotation = (turn: number, pitch: number) => {
    const nextTurn = wrap(turn, 360);
    const nextPitch = clamp(pitch, -10, 10);
    turnRef.current = nextTurn;
    pitchRef.current = nextPitch;
    setRotation({ turn: nextTurn, pitch: nextPitch });
    if (frames.length > 1) setFrameIndex(Math.floor((nextTurn / 360) * frames.length) % frames.length);
  };

  const stopInertia = () => {
    if (inertiaFrameRef.current !== null) cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
  };

  const runInertia = () => {
    velocityRef.current *= 0.92;
    if (Math.abs(velocityRef.current) < 0.02) {
      inertiaFrameRef.current = null;
      return;
    }
    commitRotation(turnRef.current + velocityRef.current, pitchRef.current);
    inertiaFrameRef.current = requestAnimationFrame(runInertia);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    stopInertia();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startTurn: turnRef.current, startPitch: pitchRef.current, lastX: event.clientX, lastTime: performance.now() };
    velocityRef.current = 0;
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    const now = performance.now();
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const timeDelta = Math.max(8, now - dragRef.current.lastTime);
    velocityRef.current = ((event.clientX - dragRef.current.lastX) * 0.95) / timeDelta;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastTime = now;
    commitRotation(dragRef.current.startTurn + dx * 1.2, dragRef.current.startPitch - dy * 0.1);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.pointerId = -1;
    setDragging(false);
    inertiaFrameRef.current = requestAnimationFrame(runInertia);
  };

  const resetRotation = (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    stopInertia();
    velocityRef.current = 0;
    commitRotation(0, -1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const turnStep = event.shiftKey ? 30 : 12;
    commitRotation(
      turnRef.current + (event.key === 'ArrowLeft' ? -turnStep : event.key === 'ArrowRight' ? turnStep : 0),
      pitchRef.current + (event.key === 'ArrowUp' ? -4 : event.key === 'ArrowDown' ? 4 : 0),
    );
    if (event.key === 'Home') resetRotation(event);
  };

  const activeImage = frames[frameIndex] ?? image;
  const angle = Math.round((rotation.turn / 360) * 360);
  const viewLabel = frames.length > 1 ? `360° / ${String(frameIndex + 1).padStart(3, '0')} of ${frames.length}` : '360° view';

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${name} 360 degree product viewer. Drag left or right to rotate through the complete frame sequence.`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`product-viewer relative h-full w-full overflow-hidden bg-[#08090a] outline-none ${dragging ? 'is-dragging' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <div
        className="product-viewer__surface relative h-full w-full"
        style={{
          transform: `perspective(1100px) rotateX(${rotation.pitch}deg) scale(${dragging ? 1.035 : 1.02})`,
          transition: dragging ? 'none' : 'transform 180ms cubic-bezier(.23,1,.32,1)',
        }}
      >
        <div className="product-viewer__media absolute inset-0">
          <img src={activeImage} alt={name} draggable={false} decoding="async" className="h-full w-full object-cover brightness-110" />
        </div>
        <div className="product-viewer__shine pointer-events-none absolute inset-0" />
        <div className="product-viewer__depth pointer-events-none absolute inset-x-[12%] bottom-[7%] h-[12%] rounded-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12 text-[9px] font-bold uppercase tracking-[.16em] text-white/80">
        <span>{compact ? 'Drag for 360°' : 'Touch + drag for 360°'}</span>
        <span className="text-[#d4a94d]">{viewLabel} · {angle}°</span>
      </div>
      <button
        type="button"
        onPointerDown={event => event.stopPropagation()}
        onClick={resetRotation}
        aria-label={`Reset ${name} 360 degree view`}
        className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/60 p-2 text-white/75 backdrop-blur transition hover:border-[#d4a94d] hover:text-[#d4a94d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a94d]"
      >
        <RotateCcw size={13} />
      </button>
    </div>
  );
}
