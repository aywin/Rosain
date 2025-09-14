import { RefObject } from "react";

interface VideoContainerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onPlayPause: () => void;
}

export default function VideoContainer({ containerRef, onPlayPause }: VideoContainerProps) {
  return (
    <div className="relative w-[70%] aspect-video rounded-lg overflow-hidden shadow-lg">
      <div ref={containerRef} className="w-full h-full pointer-events-none" />
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={onPlayPause} />
    </div>
  );
}
