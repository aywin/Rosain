"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Crop, X } from "lucide-react";
import { MathJaxContext } from "better-react-mathjax";
import PdfAssistantPanel, { PdfAssistantHandle } from "@/components/exo/PdfAssistantPanel";

const mathJaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
        inlineMath: [["\\(", "\\)"], ["$", "$"]],
        displayMath: [["\\[", "\\]"], ["$$", "$$"]],
    },
};

interface SelRect { x: number; y: number; w: number; h: number; }

export default function PdfPage() {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [selMode, setSelMode] = useState(false);
    const [selRect, setSelRect] = useState<SelRect>({ x: 0, y: 0, w: 0, h: 0 });
    const [showResolve, setShowResolve] = useState(false);

    // Refs interaction (pas de re-render dans les handlers souris)
    const isDraggingRef = useRef(false);
    const isMovingRef = useRef(false);
    const isResizingRef = useRef(false);
    const resizeDirRef = useRef("");
    const selStartRef = useRef({ x: 0, y: 0 });
    const moveOffsetRef = useRef({ x: 0, y: 0 });
    const resizeAnchorRef = useRef<{ x: number; y: number; rect: SelRect } | null>(null);
    const selRectRef = useRef<SelRect>({ x: 0, y: 0, w: 0, h: 0 });
    const selModeRef = useRef(false);

    useEffect(() => { selRectRef.current = selRect; }, [selRect]);
    useEffect(() => { selModeRef.current = selMode; }, [selMode]);

    // DOM refs
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasWrapRef = useRef<HTMLDivElement>(null);  // le div scrollable autour du canvas
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const assistantRef = useRef<PdfAssistantHandle>(null);
    const isRenderingRef = useRef(false);
    const pdfjsRef = useRef<any>(null);

    // Charger pdf.js côté client
    useEffect(() => {
        import("pdfjs-dist").then((pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            pdfjsRef.current = pdfjs;
        });
    }, []);

    // ── Charger PDF ───────────────────────────────────────────────────────────
    const loadPDF = async (file: File) => {
        if (!pdfjsRef.current) return;
        setPdfLoading(true);
        setFileName(file.name);
        exitSelection();
        try {
            const buf = await file.arrayBuffer();
            const doc = await pdfjsRef.current.getDocument({ data: buf }).promise;
            setPdfDoc(doc);
            setTotalPages(doc.numPages);
            setCurrentPage(1);
        } catch (err) {
            console.error("Erreur PDF:", err);
        } finally {
            setPdfLoading(false);
        }
    };

    // ── Redessiner l'overlay sombre ───────────────────────────────────────────
    // L'overlay a exactement la taille du canvas PDF — pas du viewport
    // Donc même en scrollant, le sombre couvre tout le document
    const redrawOverlay = useCallback((rect: SelRect) => {
        const oc = overlayCanvasRef.current;
        const pdf = pdfCanvasRef.current;
        if (!oc || !pdf) return;

        // L'overlay doit avoir la même taille que le canvas PDF
        if (oc.width !== pdf.width || oc.height !== pdf.height) {
            oc.width = pdf.width;
            oc.height = pdf.height;
        }

        const octx = oc.getContext("2d")!;
        octx.clearRect(0, 0, oc.width, oc.height);
        octx.fillStyle = "rgba(0,0,0,0.65)";
        octx.fillRect(0, 0, oc.width, oc.height);

        // La sélection est en coordonnées canvas (pas viewport)
        if (rect.w > 0 && rect.h > 0) {
            octx.clearRect(rect.x, rect.y, rect.w, rect.h);
        }
    }, []);

    // ── Rendu page PDF ────────────────────────────────────────────────────────
    const renderPage = useCallback(async (pageNum: number, doc: any) => {
        if (!doc || !pdfCanvasRef.current || isRenderingRef.current) return;
        isRenderingRef.current = true;
        try {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.8 });
            const canvas = pdfCanvasRef.current;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        } finally {
            isRenderingRef.current = false;
            // Redessiner l'overlay après chaque rendu si sélection active
            if (selModeRef.current) {
                requestAnimationFrame(() => redrawOverlay(selRectRef.current));
            }
        }
    }, [redrawOverlay]);

    useEffect(() => {
        if (pdfDoc) renderPage(currentPage, pdfDoc);
    }, [pdfDoc, currentPage, renderPage]);

    // ── Navigation — la sélection survit ─────────────────────────────────────
    const changePage = (n: number) => {
        const clamped = Math.max(1, Math.min(totalPages, n));
        if (clamped !== currentPage) setCurrentPage(clamped);
    };

    // ── Sélection ─────────────────────────────────────────────────────────────
    const enterSelection = () => {
        const empty = { x: 0, y: 0, w: 0, h: 0 };
        setSelRect(empty);
        selRectRef.current = empty;
        setShowResolve(false);
        setSelMode(true);
        selModeRef.current = true;
        requestAnimationFrame(() => redrawOverlay(empty));
    };

    const exitSelection = () => {
        setSelMode(false);
        selModeRef.current = false;
        setSelRect({ x: 0, y: 0, w: 0, h: 0 });
        selRectRef.current = { x: 0, y: 0, w: 0, h: 0 };
        setShowResolve(false);
        isDraggingRef.current = false;
        isMovingRef.current = false;
        isResizingRef.current = false;
    };

    // ── Coordonnées relatives au canvas PDF (incluant le scroll) ──────────────
    // C'est la clé : on ajoute scrollTop/scrollLeft du div scrollable
    const getCanvasPos = (e: React.MouseEvent) => {
        const canvasWrap = canvasWrapRef.current;
        const pdf = pdfCanvasRef.current;
        if (!canvasWrap || !pdf) return { x: 0, y: 0 };

        const wrapRect = canvasWrap.getBoundingClientRect();
        const canvasRect = pdf.getBoundingClientRect();

        // Position dans le viewport relative au canvas HTML affiché
        const viewX = e.clientX - canvasRect.left;
        const viewY = e.clientY - canvasRect.top;

        // Scale : le canvas CSS peut être plus petit que ses pixels internes
        const scaleX = pdf.width / canvasRect.width;
        const scaleY = pdf.height / canvasRect.height;

        return {
            x: viewX * scaleX,
            y: viewY * scaleY,
        };
    };

    // ── Mouse handlers ────────────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent) => {
        if (!selModeRef.current) return;

        // Clic sur un handle de redimensionnement
        const handleEl = (e.target as HTMLElement).closest("[data-dir]") as HTMLElement | null;
        if (handleEl) {
            const pos = getCanvasPos(e);
            isResizingRef.current = true;
            resizeDirRef.current = handleEl.dataset.dir!;
            resizeAnchorRef.current = { x: pos.x, y: pos.y, rect: { ...selRectRef.current } };
            e.preventDefault(); return;
        }

        // Clic dans la sélection existante → déplacement
        const pos = getCanvasPos(e);
        const sr = selRectRef.current;
        if (sr.w > 0 && sr.h > 0) {
            const inside = pos.x >= sr.x && pos.x <= sr.x + sr.w &&
                pos.y >= sr.y && pos.y <= sr.y + sr.h;
            if (inside) {
                isMovingRef.current = true;
                moveOffsetRef.current = { x: pos.x - sr.x, y: pos.y - sr.y };
                e.preventDefault(); return;
            }
        }

        // Nouvelle sélection
        isDraggingRef.current = true;
        selStartRef.current = pos;
        const newRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
        setSelRect(newRect);
        selRectRef.current = newRect;
        setShowResolve(false);
        e.preventDefault();
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!selModeRef.current) return;
        if (!isDraggingRef.current && !isMovingRef.current && !isResizingRef.current) return;

        const pos = getCanvasPos(e);
        const pdf = pdfCanvasRef.current;
        const maxW = pdf?.width ?? 800;
        const maxH = pdf?.height ?? 1200;

        let newRect: SelRect | null = null;

        if (isDraggingRef.current) {
            const s = selStartRef.current;
            newRect = {
                x: Math.max(0, Math.min(pos.x, s.x)),
                y: Math.max(0, Math.min(pos.y, s.y)),
                w: Math.abs(pos.x - s.x),
                h: Math.abs(pos.y - s.y),
            };
        }

        if (isMovingRef.current) {
            const sr = selRectRef.current;
            newRect = {
                ...sr,
                x: Math.max(0, Math.min(maxW - sr.w, pos.x - moveOffsetRef.current.x)),
                y: Math.max(0, Math.min(maxH - sr.h, pos.y - moveOffsetRef.current.y)),
            };
        }

        if (isResizingRef.current && resizeAnchorRef.current) {
            const dx = pos.x - resizeAnchorRef.current.x;
            const dy = pos.y - resizeAnchorRef.current.y;
            const dir = resizeDirRef.current;
            const r = { ...resizeAnchorRef.current.rect };
            if (dir.includes("e")) r.w = Math.max(20, r.w + dx);
            if (dir.includes("s")) r.h = Math.max(20, r.h + dy);
            if (dir.includes("w")) { r.x += dx; r.w = Math.max(20, r.w - dx); }
            if (dir.includes("n")) { r.y += dy; r.h = Math.max(20, r.h - dy); }
            newRect = r;
        }

        if (newRect) {
            setSelRect(newRect);
            selRectRef.current = newRect;
            redrawOverlay(newRect);
        }
    };

    const onMouseUp = () => {
        if (!selModeRef.current) return;
        if (isDraggingRef.current || isMovingRef.current || isResizingRef.current) {
            isDraggingRef.current = false;
            isMovingRef.current = false;
            isResizingRef.current = false;
            const sr = selRectRef.current;
            if (sr.w > 10 && sr.h > 10) setShowResolve(true);
        }
    };

    // ── Résoudre : la sélection est déjà en coordonnées canvas ───────────────
    const handleResolve = () => {
        const sr = selRectRef.current;
        const pdfCanvas = pdfCanvasRef.current;
        if (!pdfCanvas || sr.w < 5 || sr.h < 5) return;

        // Les coords selRect sont déjà en pixels canvas — pas besoin de scale
        const cX = Math.max(0, sr.x);
        const cY = Math.max(0, sr.y);
        const cW = Math.min(sr.w, pdfCanvas.width - cX);
        const cH = Math.min(sr.h, pdfCanvas.height - cY);
        if (cW <= 0 || cH <= 0) return;

        const out = document.createElement("canvas");
        out.width = cW; out.height = cH;
        out.getContext("2d")!.drawImage(pdfCanvas, cX, cY, cW, cH, 0, 0, cW, cH);

        out.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `exo-p${currentPage}.png`, { type: "image/png" });
            exitSelection();
            assistantRef.current?.receiveCapture(file);
        }, "image/png");
    };

    // ── Conversion coordonnées canvas → coordonnées CSS (pour afficher le rect) ──
    // Le rectangle de sélection est affiché en CSS sur le canvas HTML affiché
    // donc on doit convertir depuis pixels canvas → pixels CSS
    const canvasToCss = (rect: SelRect) => {
        const pdf = pdfCanvasRef.current;
        if (!pdf || pdf.width === 0) return rect;
        const canvasRect = pdf.getBoundingClientRect();
        const scaleX = canvasRect.width / pdf.width;
        const scaleY = canvasRect.height / pdf.height;
        return {
            x: rect.x * scaleX,
            y: rect.y * scaleY,
            w: rect.w * scaleX,
            h: rect.h * scaleY,
        };
    };

    const cssRect = canvasToCss(selRect);

    // ── Handles redimensionnement ─────────────────────────────────────────────
    const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const handleStyle = (dir: string): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: "absolute", width: 12, height: 12,
            background: "#fff", border: "2px solid #3b82f6",
            borderRadius: "50%", zIndex: 5,
        };
        if (dir === "nw") return { ...base, top: -6, left: -6, cursor: "nw-resize" };
        if (dir === "n") return { ...base, top: -6, left: "calc(50% - 6px)", cursor: "n-resize" };
        if (dir === "ne") return { ...base, top: -6, right: -6, cursor: "ne-resize" };
        if (dir === "e") return { ...base, top: "calc(50% - 6px)", right: -6, cursor: "e-resize" };
        if (dir === "se") return { ...base, bottom: -6, right: -6, cursor: "se-resize" };
        if (dir === "s") return { ...base, bottom: -6, left: "calc(50% - 6px)", cursor: "s-resize" };
        if (dir === "sw") return { ...base, bottom: -6, left: -6, cursor: "sw-resize" };
        return { ...base, top: "calc(50% - 6px)", left: -6, cursor: "w-resize" };
    };

    return (
        <MathJaxContext config={mathJaxConfig}>
            <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

                {/* ── Top bar globale ── */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b shadow-sm flex-shrink-0">
                    <Link href="/exercices" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
                        <ArrowLeft size={16} /> Exercices
                    </Link>
                    <div className="w-px h-4 bg-gray-200" />
                    <span className="text-sm font-semibold text-gray-700 truncate max-w-xs">
                        {fileName || "Maths PDF"}
                    </span>
                    <div className="ml-auto">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                        >
                            Charger un PDF
                        </button>
                        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadPDF(f); e.target.value = ""; }}
                        />
                    </div>
                </div>

                {/* ── Corps deux colonnes ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* ── Colonne gauche ── */}
                    <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 overflow-hidden">

                        {/* Nav pages + bouton Sélectionner — sticky, ne scrolle pas */}
                        {pdfDoc && (
                            <div className="flex items-center justify-between px-4 py-2 bg-white border-b flex-shrink-0 z-10">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <input
                                            type="number" min={1} max={totalPages} value={currentPage}
                                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) changePage(v); }}
                                            className="w-12 text-center border border-gray-300 rounded-md py-0.5 text-sm focus:outline-none focus:border-blue-500"
                                        />
                                        <span>/ {totalPages}</span>
                                    </div>
                                    <button onClick={() => changePage(currentPage + 1)} disabled={currentPage >= totalPages}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => selMode ? exitSelection() : enterSelection()}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${selMode
                                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                        }`}
                                >
                                    {selMode ? <><X size={15} /> Annuler</> : <><Crop size={15} /> Sélectionner</>}
                                </button>
                            </div>
                        )}

                        {/* Zone scrollable — contient le canvas PDF */}
                        <div
                            ref={canvasWrapRef}
                            className="flex-1 overflow-auto flex justify-center bg-gray-200"
                            style={{ padding: pdfDoc ? "24px" : 0 }}
                        >
                            {/* État vide */}
                            {!pdfDoc && !pdfLoading && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                                    <div className="text-5xl">📄</div>
                                    <p className="text-base font-medium">Charge un PDF pour commencer</p>
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition text-sm">
                                        Choisir un PDF
                                    </button>
                                </div>
                            )}

                            {/* Loading */}
                            {pdfLoading && (
                                <div className="flex items-center justify-center h-full">
                                    <div className="flex flex-col items-center gap-3 text-gray-500">
                                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-sm">Chargement…</p>
                                    </div>
                                </div>
                            )}

                            {/* Container relatif — canvas PDF + overlay superposé */}
                            {pdfDoc && (
                                <div
                                    className="relative select-none"
                                    style={{
                                        alignSelf: "flex-start",
                                        cursor: selMode ? "crosshair" : "default",
                                    }}
                                    onMouseDown={onMouseDown}
                                    onMouseMove={onMouseMove}
                                    onMouseUp={onMouseUp}
                                    onMouseLeave={onMouseUp}
                                >
                                    {/* Canvas PDF */}
                                    <canvas
                                        ref={pdfCanvasRef}
                                        className="block shadow-xl rounded"
                                        style={{ maxWidth: "100%" }}
                                    />

                                    {/* Canvas overlay sombre — même taille que le canvas PDF */}
                                    {selMode && (
                                        <canvas
                                            ref={overlayCanvasRef}
                                            className="absolute top-0 left-0 rounded"
                                            style={{
                                                // Affiché à la même taille CSS que le canvas PDF
                                                width: "100%",
                                                height: "100%",
                                                pointerEvents: "none",
                                            }}
                                        />
                                    )}

                                    {/* Rectangle de sélection + boutons flottants style MathsGPT */}
                                    {selMode && selRect.w > 0 && selRect.h > 0 && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                left: cssRect.x,
                                                top: cssRect.y,
                                                width: cssRect.w,
                                                height: cssRect.h,
                                                border: "2px solid #3b82f6",
                                                cursor: "move",
                                                pointerEvents: "all",
                                                zIndex: 10,
                                                boxSizing: "border-box",
                                            }}
                                        >
                                            {/* Badge dimensions — au-dessus à gauche */}
                                            <div style={{
                                                position: "absolute", top: -24, left: 0,
                                                background: "#3b82f6", color: "#fff",
                                                fontSize: 11, fontWeight: 600,
                                                padding: "2px 7px", borderRadius: 4,
                                                whiteSpace: "nowrap", pointerEvents: "none",
                                            }}>
                                                {Math.round(cssRect.w)} × {Math.round(cssRect.h)}
                                            </div>

                                            {/* Handles resize */}
                                            {handles.map((dir) => (
                                                <div key={dir} style={handleStyle(dir)} data-dir={dir} />
                                            ))}

                                            {/* Boutons Résoudre + X — flottants juste sous la sélection, centrés */}
                                            {showResolve && (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        top: "calc(100% + 10px)",
                                                        left: "50%",
                                                        transform: "translateX(-50%)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        pointerEvents: "all",
                                                        zIndex: 30,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleResolve(); }}
                                                        style={{
                                                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: 10,
                                                            padding: "8px 22px",
                                                            fontWeight: 700,
                                                            fontSize: 14,
                                                            cursor: "pointer",
                                                            boxShadow: "0 4px 16px rgba(34,197,94,0.45)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 6,
                                                        }}
                                                    >
                                                        ✓ Résoudre
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); exitSelection(); }}
                                                        style={{
                                                            width: 34, height: 34,
                                                            borderRadius: "50%",
                                                            background: "rgba(30,30,30,0.75)",
                                                            border: "1.5px solid rgba(255,255,255,0.2)",
                                                            color: "#fff",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            backdropFilter: "blur(4px)",
                                                        }}
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Hint centré */}
                                    {selMode && selRect.w === 0 && (
                                        <div style={{
                                            position: "absolute", top: "50%", left: "50%",
                                            transform: "translate(-50%, -50%)",
                                            color: "rgba(255,255,255,0.7)", fontSize: 15,
                                            fontWeight: 500, pointerEvents: "none",
                                            textAlign: "center", whiteSpace: "nowrap",
                                            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                                        }}>
                                            Cliquez et faites glisser pour sélectionner une zone
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* ── Colonne droite : assistant ── */}
                    <div className="w-[380px] flex-shrink-0 flex flex-col bg-white overflow-hidden">
                        <PdfAssistantPanel ref={assistantRef} />
                    </div>
                </div>
            </div>
        </MathJaxContext>
    );
}