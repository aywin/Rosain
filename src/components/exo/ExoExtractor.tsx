// src/components/exo/ExoExtractor.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { X, Crop } from "lucide-react";

interface ExoExtractorProps {
    file: File;
    onClose: () => void;
    onCapture: (imageBlob: Blob) => void;
}

interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function ExoExtractor({ file, onClose, onCapture }: ExoExtractorProps) {
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isSelecting, setIsSelecting] = useState(false);
    const [selection, setSelection] = useState<SelectionBox | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isSelecting) {
                    setIsSelecting(false);
                    setSelection(null);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isSelecting, onClose]);

    const handleStartSelection = () => {
        setIsSelecting(true);
        setSelection(null);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelecting || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (selection) {
            const handle = getResizeHandle(x, y, selection);
            if (handle) {
                setIsResizing(handle);
                setDragStart({ x, y });
                return;
            }

            if (isInsideSelection(x, y, selection)) {
                setIsDragging(true);
                setDragStart({ x: x - selection.x, y: y - selection.y });
                return;
            }
        }

        setSelection({ x, y, width: 0, height: 0 });
        setDragStart({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelecting || !containerRef.current || !dragStart) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        if (isDragging && selection) {
            setSelection({
                ...selection,
                x: Math.max(0, Math.min(currentX - dragStart.x, rect.width - selection.width)),
                y: Math.max(0, Math.min(currentY - dragStart.y, rect.height - selection.height))
            });
        } else if (isResizing && selection) {
            const newSelection = { ...selection };

            if (isResizing.includes('n')) {
                const dy = currentY - dragStart.y;
                newSelection.y = Math.max(0, newSelection.y + dy);
                newSelection.height = Math.max(30, newSelection.height - dy);
            }
            if (isResizing.includes('s')) {
                newSelection.height = Math.max(30, currentY - selection.y);
            }
            if (isResizing.includes('w')) {
                const dx = currentX - dragStart.x;
                newSelection.x = Math.max(0, newSelection.x + dx);
                newSelection.width = Math.max(30, newSelection.width - dx);
            }
            if (isResizing.includes('e')) {
                newSelection.width = Math.max(30, currentX - selection.x);
            }

            setSelection(newSelection);
            setDragStart({ x: currentX, y: currentY });
        } else if (selection && selection.width === 0 && selection.height === 0) {
            setSelection({
                x: Math.min(dragStart.x, currentX),
                y: Math.min(dragStart.y, currentY),
                width: Math.abs(currentX - dragStart.x),
                height: Math.abs(currentY - dragStart.y)
            });
        }
    };

    const handleMouseUp = () => {
        setDragStart(null);
        setIsDragging(false);
        setIsResizing(null);
    };

    const isInsideSelection = (x: number, y: number, sel: SelectionBox) => {
        return x >= sel.x && x <= sel.x + sel.width &&
            y >= sel.y && y <= sel.y + sel.height;
    };

    const getResizeHandle = (x: number, y: number, sel: SelectionBox) => {
        const threshold = 15; // Plus grande zone de détection
        let handle = '';

        if (Math.abs(y - sel.y) < threshold) handle += 'n';
        if (Math.abs(y - (sel.y + sel.height)) < threshold) handle += 's';
        if (Math.abs(x - sel.x) < threshold) handle += 'w';
        if (Math.abs(x - (sel.x + sel.width)) < threshold) handle += 'e';

        return handle || null;
    };

    const getCursorStyle = () => {
        if (!isSelecting) return 'default';
        if (isDragging) return 'move';
        if (isResizing) {
            if (isResizing === 'nw' || isResizing === 'se') return 'nwse-resize';
            if (isResizing === 'ne' || isResizing === 'sw') return 'nesw-resize';
            if (isResizing.includes('n') || isResizing.includes('s')) return 'ns-resize';
            if (isResizing.includes('w') || isResizing.includes('e')) return 'ew-resize';
        }
        if (selection && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const lastMouseX = dragStart?.x ?? 0;
            const lastMouseY = dragStart?.y ?? 0;
            if (isInsideSelection(lastMouseX, lastMouseY, selection)) {
                return 'move';
            }
        }
        return 'crosshair';
    };

    const handleResolve = async () => {
        if (!selection || !iframeRef.current) return;

        try {
            // Demander au user de faire screenshot puis on l'attend via paste
            // Alternative: Fermer et afficher instructions
            onClose();

            // Timeout pour laisser time au user de screenshot
            setTimeout(() => {
                alert(
                    `Zone sélectionnée : ${Math.round(selection.width)} × ${Math.round(selection.height)}px\n\n` +
                    `Prenez un screenshot de cette zone (Win+Shift+S / Cmd+Shift+4)\n` +
                    `puis collez-le dans l'assistant avec Ctrl+V`
                );
            }, 100);

        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <h3 className="font-medium text-white text-sm truncate max-w-sm">{file.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                    {!isSelecting ? (
                        <button
                            onClick={handleStartSelection}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                        >
                            <Crop size={16} />
                            <span>Sélectionner</span>
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setIsSelecting(false);
                                    setSelection(null);
                                }}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                            >
                                Annuler
                            </button>
                            {selection && selection.width > 30 && selection.height > 30 && (
                                <button
                                    onClick={handleResolve}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                                >
                                    Résoudre
                                </button>
                            )}
                        </>
                    )}

                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* PDF Container */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-auto bg-gray-800"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: getCursorStyle() }}
            >
                {/* PDF iframe - render seulement si fileUrl existe */}
                {fileUrl && (
                    <iframe
                        ref={iframeRef}
                        src={fileUrl}
                        className="w-full h-full border-0"
                        title={file.name}
                        style={{ pointerEvents: isSelecting ? 'none' : 'auto' }}
                    />
                )}

                {!fileUrl && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-gray-400">Chargement du PDF...</p>
                        </div>
                    </div>
                )}

                {/* Overlay MathsGPT style - zone sombre partout sauf sélection */}
                {isSelecting && (
                    <div className="absolute inset-0 pointer-events-none">
                        {selection ? (
                            <>
                                {/* Top dark */}
                                <div
                                    className="absolute bg-black/70"
                                    style={{
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: Math.max(0, selection.y)
                                    }}
                                />
                                {/* Left dark */}
                                <div
                                    className="absolute bg-black/70"
                                    style={{
                                        left: 0,
                                        top: selection.y,
                                        width: Math.max(0, selection.x),
                                        height: selection.height
                                    }}
                                />
                                {/* Right dark */}
                                <div
                                    className="absolute bg-black/70"
                                    style={{
                                        left: selection.x + selection.width,
                                        top: selection.y,
                                        right: 0,
                                        height: selection.height
                                    }}
                                />
                                {/* Bottom dark */}
                                <div
                                    className="absolute bg-black/70"
                                    style={{
                                        left: 0,
                                        top: selection.y + selection.height,
                                        width: '100%',
                                        bottom: 0
                                    }}
                                />

                                {/* Selection border + handles */}
                                <div
                                    className="absolute border-2 border-blue-500 pointer-events-auto transition-all"
                                    style={{
                                        left: selection.x,
                                        top: selection.y,
                                        width: selection.width,
                                        height: selection.height
                                    }}
                                >
                                    {/* Corner handles - plus gros et visuels */}
                                    <div className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" />
                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full cursor-nesw-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" />
                                    <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-blue-500 rounded-full cursor-nesw-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" />
                                    <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" />

                                    {/* Dimensions badge */}
                                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shadow-lg">
                                        {Math.round(selection.width)} × {Math.round(selection.height)}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-black/70" />
                        )}
                    </div>
                )}
            </div>

            {/* Instructions footer */}
            {isSelecting && (
                <div className="p-3 bg-blue-900/30 border-t border-blue-800/50 text-center text-xs text-blue-200">
                    <span className="font-semibold">Sélectionnez UNE SEULE question</span> pour obtenir la meilleure réponse possible
                </div>
            )}
        </div>
    );
}