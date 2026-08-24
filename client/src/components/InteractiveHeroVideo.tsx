import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

type InteractiveHeroVideoProps = {
  name?: string;
  sources: string[];
};

type Rotation = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function InteractiveHeroVideo({ name = 'FOAMX hero', sources }: InteractiveHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, rotation: { x: -1, y: 0 } as Rotation });
  const [sourceIndex, setSourceIndex] = useState(0);
  const [rotation, setRotation] = useState<Rotation>({ x: -1, y: 0 });
  const [dragging, setDragging] = useState(false);

  const source = sources[Math.min(sourceIndex, sources.length - 1)];

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, rotation };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setRotation({
      x: clamp(dragRef.current.rotation.x - dy * 0.1, -8, 8),
      y: clamp(dragRef.current.rotation.y + dx * 0.22, -14, 14),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.pointerId = -1;
    setDragging(false);
  };

  const reset = (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    setRotation({ x: -1, y: 0 });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') return reset(event);
    const step = event.shiftKey ? 5 : 3;
    setRotation({
      x: clamp(rotation.x + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), -8, 8),
      y: clamp(rotation.y + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), -14, 14),
    });
  };

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${name} interactive video. Drag left or right to rotate the hero.`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`hero-viewer absolute inset-0 overflow-hidden outline-none ${dragging ? 'is-dragging' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <div
        className="hero-viewer__surface absolute -inset-[5%]"
        style={{
          transform: `perspective(1100px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${dragging ? 1.035 : 1.02})`,
          transition: dragging ? 'none' : 'transform 200ms cubic-bezier(.23,1,.32,1)',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={event => { event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }}
          onCanPlay={event => { event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }}
          onError={() => setSourceIndex(index => Math.min(index + 1, sources.length - 1))}
          className="hero-viewer__video absolute inset-0 h-full w-full object-cover brightness-125 opacity-70"
          key={source}
        >
          <source src={source} type="video/mp4" />
        </video>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#08090a]/75 to-transparent px-5 pb-8 pt-16 text-[10px] font-bold uppercase tracking-[.24em] text-white/60 lg:px-8">
        <span>Touch + drag to rotate</span>
        <span className="text-[#d4a94d]">{rotation.y > 0 ? '+' : ''}{Math.round(rotation.y)}°</span>
      </div>
      <button
        type="button"
        aria-label="Reset hero rotation"
        onPointerDown={event => event.stopPropagation()}
        onClick={reset}
        className="absolute right-5 top-24 rounded-full border border-white/25 bg-black/55 p-2 text-white/75 backdrop-blur transition hover:border-[#d4a94d] hover:text-[#d4a94d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a94d] lg:right-8"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
