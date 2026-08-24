import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

type Product3DViewerProps = {
  name: string;
  image: string;
  frames?: string[];
  compact?: boolean;
};

type Rotation = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrapDegrees = (value: number) => ((value % 360) + 360) % 360;

export default function Product3DViewer({ name, image, frames = [], compact = false }: Product3DViewerProps) {
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, rotation: { x: -2, y: 0 } as Rotation });
  const [rotation, setRotation] = useState<Rotation>({ x: -2, y: 0 });
  const [frameIndex, setFrameIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    frames.forEach(src => {
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = src;
    });
  }, [frames]);

  const updateRotation = (next: Rotation) => {
    setRotation(next);
    if (frames.length > 1) {
      const nextFrame = Math.round((wrapDegrees(next.y) / 360) * frames.length) % frames.length;
      setFrameIndex(nextFrame);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, rotation };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    updateRotation({
      x: clamp(dragRef.current.rotation.x - dy * 0.12, -12, 12),
      y: dragRef.current.rotation.y + dx * 1.1,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.pointerId = -1;
    setDragging(false);
  };

  const resetRotation = (event?: React.MouseEvent | React.KeyboardEvent) => {
    event?.stopPropagation();
    updateRotation({ x: -2, y: 0 });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 30 : 15;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      updateRotation({
        x: clamp(rotation.x + (event.key === 'ArrowUp' ? -6 : event.key === 'ArrowDown' ? 6 : 0), -12, 12),
        y: rotation.y + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
      });
    }
    if (event.key === 'Home') resetRotation(event);
  };

  const angle = (rotation.y * Math.PI) / 180;
  const parallax = Math.sin(angle) * 7;
  const visualYaw = Math.sin(angle) * 12;
  const visualPitch = clamp(rotation.x, -9, 9);
  const viewLabel = frames.length > 1 ? `View ${String(frameIndex + 1).padStart(3, '0')} / ${frames.length}` : '3D view';
  const activeImage = frames[frameIndex] ?? image;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${name} interactive 3D product viewer. Drag left or right to rotate through the complete product spin.`}
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
          transform: `translate3d(${parallax}px, 0, 0) rotateX(${visualPitch}deg) rotateY(${visualYaw}deg) scale(${dragging ? 1.075 : 1.06})`,
          transition: dragging ? 'none' : 'transform 180ms cubic-bezier(.23,1,.32,1)',
        }}
      >
        <div className="product-viewer__media absolute inset-0">
          <img src={activeImage} alt={name} draggable={false} decoding="async" className="h-full w-full object-cover brightness-110" />
        </div>
        <div className="product-viewer__shine pointer-events-none absolute inset-0" />
        <div className="product-viewer__depth pointer-events-none absolute inset-x-[12%] bottom-[7%] h-[12%] rounded-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12 text-[9px] font-bold uppercase tracking-[.18em] text-white/80">
        <span>{compact ? 'Drag to rotate' : 'Touch + drag to explore'}</span>
        <span className="text-[#d4a94d]">{viewLabel}</span>
      </div>
      <button
        type="button"
        onPointerDown={event => event.stopPropagation()}
        onClick={resetRotation}
        aria-label={`Reset ${name} view`}
        className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/60 p-2 text-white/75 backdrop-blur transition hover:border-[#d4a94d] hover:text-[#d4a94d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a94d]"
      >
        <RotateCcw size={13} />
      </button>
    </div>
  );
}
