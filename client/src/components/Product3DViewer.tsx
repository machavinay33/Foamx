import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

type Product3DViewerProps = {
  name: string;
  image: string;
  compact?: boolean;
};

type Rotation = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Product3DViewer({ name, image, compact = false }: Product3DViewerProps) {
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, rotation: { x: -3, y: 0 } as Rotation });
  const [rotation, setRotation] = useState<Rotation>({ x: -3, y: 0 });
  const [dragging, setDragging] = useState(false);

  const updateRotation = (next: Rotation) => setRotation(next);

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
      x: clamp(dragRef.current.rotation.x - dy * 0.16, -26, 26),
      y: clamp(dragRef.current.rotation.y + dx * 0.35, -32, 32),
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
    updateRotation({ x: -3, y: 0 });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 18 : 10;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      updateRotation({
        x: clamp(rotation.x + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), -26, 26),
        y: clamp(rotation.y + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), -32, 32),
      });
    }
    if (event.key === 'Home') resetRotation(event);
  };

  const normalizedRotation = Math.round(rotation.y);
  const rotationLabel = normalizedRotation > 0 ? `+${normalizedRotation}°` : `${normalizedRotation}°`;
  const parallax = Math.sin((rotation.y * Math.PI) / 180) * 8;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${name} interactive 3D product viewer. Drag left or right to rotate.`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`product-viewer relative h-full w-full overflow-hidden outline-none ${dragging ? 'is-dragging' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <div
        className="product-viewer__surface relative h-full w-full"
        style={{
          transform: `perspective(900px) translateX(${parallax}px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${dragging ? 1.015 : 1})`,
          transition: dragging ? 'none' : 'transform 180ms cubic-bezier(.23,1,.32,1)',
        }}
      >
        <div className="product-viewer__media absolute inset-0">
          <img src={image} alt={name} draggable={false} className="h-full w-full object-cover brightness-110" />
        </div>
        <div className="product-viewer__shine pointer-events-none absolute inset-0" />
        <div className="product-viewer__depth pointer-events-none absolute inset-x-[12%] bottom-[7%] h-[12%] rounded-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-12 text-[9px] font-bold uppercase tracking-[.18em] text-white/80">
        <span>{compact ? 'Drag to rotate' : 'Touch + drag to explore'}</span>
        <span className="text-[#d4a94d]">{rotationLabel}</span>
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
