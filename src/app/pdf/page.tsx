"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Crop, X, FileText, Bot } from "lucide-react";
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
type MobileTab = "pdf" | "assistant";

export default function PdfPage() {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [selMode, setSelMode] = useState(false);
    const [selRect, setSelRect] = useState<SelRect>({ x: 0, y: 0, w: 0, h: 0 });
    const [showResolve, setShowResolve] = useState(false);
    const [mobileTab, setMobileTab] = useState<MobileTab>("pdf");

    // Drag/resize state — no re-renders
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
    const desktopCanvasRef = useRef<HTMLCanvasElement>(null);
    const mobileCanvasRef = useRef<HTMLCanvasElement>(null);
    const desktopOverlayRef = useRef<HTMLCanvasElement>(null);
    const mobileOverlayRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const assistantRef = useRef<PdfAssistantHandle>(null);
    const pdfjsRef = useRef<any>(null);
    const pdfDocRef = useRef<any>(null);

    // Render state
    const renderTaskRef = useRef<any>(null);
    const isRenderingRef = useRef(false);
    const pendingPageRef = useRef<number | null>(null);

    useEffect(() => { pdfDocRef.current = pdfDoc; }, [pdfDoc]);

    // isMobile: detect which canvas is active
    const getActiveRefs = useCallback(() => {
        const isMobile = window.innerWidth < 768;
        return {
            canvas: isMobile ? mobileCanvasRef.current : desktopCanvasRef.current,
            overlay: isMobile ? mobileOverlayRef.current : desktopOverlayRef.current,
        };
    }, []);

    // Load pdfjs
    useEffect(() => {
        import("pdfjs-dist").then((pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            pdfjsRef.current = pdfjs;
        });
    }, []);

    // ── Overlay ────────────────────────────────────────────────────────────────
    const redrawOverlay = useCallback((rect: SelRect) => {
        const { canvas, overlay } = getActiveRefs();
        if (!overlay || !canvas) return;
        if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
            overlay.width = canvas.width;
            overlay.height = canvas.height;
        }
        const ctx = overlay.getContext("2d")!;
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, overlay.width, overlay.height);
        if (rect.w > 0 && rect.h > 0) ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
    }, [getActiveRefs]);

    // ── Render page — robust with cancel + queue ───────────────────────────────
    const renderPage = useCallback(async (pageNum: number, doc: any) => {
        if (!doc) return;

        if (isRenderingRef.current) {
            pendingPageRef.current = pageNum;
            return;
        }

        const { canvas } = getActiveRefs();
        if (!canvas) return;

        if (renderTaskRef.current) {
            try { renderTaskRef.current.cancel(); } catch (_) { }
            renderTaskRef.current = null;
        }

        isRenderingRef.current = true;
        pendingPageRef.current = null;

        try {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.8 });
            const c = getActiveRefs().canvas; // re-check after async
            if (!c) return;
            c.width = viewport.width;
            c.height = viewport.height;
            const task = page.render({ canvasContext: c.getContext("2d")!, viewport });
            renderTaskRef.current = task;
            await task.promise;
        } catch (err: any) {
            if (err?.name !== "RenderingCancelledException") console.error("PDF render:", err);
        } finally {
            isRenderingRef.current = false;
            renderTaskRef.current = null;
            if (selModeRef.current) requestAnimationFrame(() => redrawOverlay(selRectRef.current));
            if (pendingPageRef.current !== null) {
                const next = pendingPageRef.current;
                pendingPageRef.current = null;
                renderPage(next, pdfDocRef.current);
            }
        }
    }, [getActiveRefs, redrawOverlay]);

    useEffect(() => {
        if (pdfDoc) renderPage(currentPage, pdfDoc);
    }, [pdfDoc, currentPage, renderPage]);

    // Re-render when switching mobile tab back to PDF
    useEffect(() => {
        if (mobileTab === "pdf" && pdfDocRef.current) {
            isRenderingRef.current = false; // reset in case stuck
            setTimeout(() => renderPage(currentPage, pdfDocRef.current), 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mobileTab]);

    // ── Load PDF ───────────────────────────────────────────────────────────────
    const loadPDF = async (file: File) => {
        if (!pdfjsRef.current) return;
        setPdfLoading(true);
        setFileName(file.name);
        exitSelection();
        if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch (_) { } }
        renderTaskRef.current = null;
        isRenderingRef.current = false;
        pendingPageRef.current = null;
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

    const changePage = (n: number) => {
        const c = Math.max(1, Math.min(totalPages, n));
        if (c !== currentPage) setCurrentPage(c);
    };

    // ── Selection ──────────────────────────────────────────────────────────────
    const enterSelection = () => {
        const empty = { x: 0, y: 0, w: 0, h: 0 };
        setSelRect(empty); selRectRef.current = empty;
        setShowResolve(false); setSelMode(true); selModeRef.current = true;
        requestAnimationFrame(() => redrawOverlay(empty));
    };

    const exitSelection = () => {
        setSelMode(false); selModeRef.current = false;
        setSelRect({ x: 0, y: 0, w: 0, h: 0 }); selRectRef.current = { x: 0, y: 0, w: 0, h: 0 };
        setShowResolve(false);
        isDraggingRef.current = false; isMovingRef.current = false; isResizingRef.current = false;
    };

    // ── Canvas position helper ─────────────────────────────────────────────────
    const getCanvasPos = (clientX: number, clientY: number) => {
        const { canvas } = getActiveRefs();
        if (!canvas) return { x: 0, y: 0 };
        const r = canvas.getBoundingClientRect();
        return {
            x: (clientX - r.left) * (canvas.width / r.width),
            y: (clientY - r.top) * (canvas.height / r.height),
        };
    };

    // ── Pointer logic ──────────────────────────────────────────────────────────
    const processDown = (clientX: number, clientY: number, target: EventTarget) => {
        if (!selModeRef.current) return;
        const handleEl = (target as HTMLElement).closest("[data-dir]") as HTMLElement | null;
        if (handleEl) {
            const pos = getCanvasPos(clientX, clientY);
            isResizingRef.current = true;
            resizeDirRef.current = handleEl.dataset.dir!;
            resizeAnchorRef.current = { ...pos, rect: { ...selRectRef.current } };
            return;
        }
        const pos = getCanvasPos(clientX, clientY);
        const sr = selRectRef.current;
        if (sr.w > 0 && sr.h > 0) {
            const inside = pos.x >= sr.x && pos.x <= sr.x + sr.w && pos.y >= sr.y && pos.y <= sr.y + sr.h;
            if (inside) {
                isMovingRef.current = true;
                moveOffsetRef.current = { x: pos.x - sr.x, y: pos.y - sr.y };
                return;
            }
        }
        isDraggingRef.current = true;
        selStartRef.current = pos;
        const nr = { x: pos.x, y: pos.y, w: 0, h: 0 };
        setSelRect(nr); selRectRef.current = nr; setShowResolve(false);
    };

    const processMove = (clientX: number, clientY: number) => {
        if (!selModeRef.current) return;
        if (!isDraggingRef.current && !isMovingRef.current && !isResizingRef.current) return;
        const pos = getCanvasPos(clientX, clientY);
        const { canvas } = getActiveRefs();
        const maxW = canvas?.width ?? 800, maxH = canvas?.height ?? 1200;
        let nr: SelRect | null = null;

        if (isDraggingRef.current) {
            const s = selStartRef.current;
            nr = { x: Math.max(0, Math.min(pos.x, s.x)), y: Math.max(0, Math.min(pos.y, s.y)), w: Math.abs(pos.x - s.x), h: Math.abs(pos.y - s.y) };
        }
        if (isMovingRef.current) {
            const sr = selRectRef.current;
            nr = { ...sr, x: Math.max(0, Math.min(maxW - sr.w, pos.x - moveOffsetRef.current.x)), y: Math.max(0, Math.min(maxH - sr.h, pos.y - moveOffsetRef.current.y)) };
        }
        if (isResizingRef.current && resizeAnchorRef.current) {
            const dx = pos.x - resizeAnchorRef.current.x, dy = pos.y - resizeAnchorRef.current.y;
            const dir = resizeDirRef.current, r = { ...resizeAnchorRef.current.rect };
            if (dir.includes("e")) r.w = Math.max(20, r.w + dx);
            if (dir.includes("s")) r.h = Math.max(20, r.h + dy);
            if (dir.includes("w")) { r.x += dx; r.w = Math.max(20, r.w - dx); }
            if (dir.includes("n")) { r.y += dy; r.h = Math.max(20, r.h - dy); }
            nr = r;
        }
        if (nr) { setSelRect(nr); selRectRef.current = nr; redrawOverlay(nr); }
    };

    const processUp = () => {
        if (!selModeRef.current) return;
        if (isDraggingRef.current || isMovingRef.current || isResizingRef.current) {
            isDraggingRef.current = false; isMovingRef.current = false; isResizingRef.current = false;
            const sr = selRectRef.current;
            if (sr.w > 10 && sr.h > 10) setShowResolve(true);
        }
    };

    const onMouseDown = (e: React.MouseEvent) => { processDown(e.clientX, e.clientY, e.target); e.preventDefault(); };
    const onMouseMove = (e: React.MouseEvent) => processMove(e.clientX, e.clientY);
    const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; if (t) { processDown(t.clientX, t.clientY, e.target); if (selModeRef.current) e.preventDefault(); } };
    const onTouchMove = (e: React.TouchEvent) => { const t = e.touches[0]; if (t) { processMove(t.clientX, t.clientY); if (selModeRef.current) e.preventDefault(); } };

    // ── Resolve ────────────────────────────────────────────────────────────────
    const handleResolve = () => {
        const sr = selRectRef.current;
        const { canvas } = getActiveRefs();
        if (!canvas || sr.w < 5 || sr.h < 5) return;
        const cX = Math.max(0, sr.x), cY = Math.max(0, sr.y);
        const cW = Math.min(sr.w, canvas.width - cX), cH = Math.min(sr.h, canvas.height - cY);
        if (cW <= 0 || cH <= 0) return;
        const out = document.createElement("canvas");
        out.width = cW; out.height = cH;
        out.getContext("2d")!.drawImage(canvas, cX, cY, cW, cH, 0, 0, cW, cH);
        out.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `exo-p${currentPage}.png`, { type: "image/png" });
            exitSelection();
            assistantRef.current?.receiveCapture(file);
            setMobileTab("assistant");
        }, "image/png");
    };

    // ── CSS rect helper ────────────────────────────────────────────────────────
    const canvasToCss = (rect: SelRect, canvasEl: HTMLCanvasElement | null): SelRect => {
        if (!canvasEl || canvasEl.width === 0) return rect;
        const r = canvasEl.getBoundingClientRect();
        const sx = r.width / canvasEl.width, sy = r.height / canvasEl.height;
        return { x: rect.x * sx, y: rect.y * sy, w: rect.w * sx, h: rect.h * sy };
    };

    // ── Resize handles ─────────────────────────────────────────────────────────
    const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const handleStyle = (dir: string): React.CSSProperties => {
        const sz = 14, off = -7, mid = `calc(50% - 7px)`;
        const base: React.CSSProperties = { position: "absolute", width: sz, height: sz, background: "#fff", border: "2px solid #3b82f6", borderRadius: "50%", zIndex: 5, touchAction: "none" };
        const pos: Record<string, React.CSSProperties> = { nw: { top: off, left: off, cursor: "nw-resize" }, n: { top: off, left: mid, cursor: "n-resize" }, ne: { top: off, right: off, cursor: "ne-resize" }, e: { top: mid, right: off, cursor: "e-resize" }, se: { bottom: off, right: off, cursor: "se-resize" }, s: { bottom: off, left: mid, cursor: "s-resize" }, sw: { bottom: off, left: off, cursor: "sw-resize" }, w: { top: mid, left: off, cursor: "w-resize" } };
        return { ...base, ...pos[dir] };
    };

    // ── Shared sub-components ──────────────────────────────────────────────────
    const NavBar = () => !pdfDoc ? null : (
        <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-white border-b flex-shrink-0">
            <div className="flex items-center gap-1.5">
                <button onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                    <input type="number" min={1} max={totalPages} value={currentPage}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) changePage(v); }}
                        className="w-10 md:w-12 text-center border border-gray-300 rounded-md py-0.5 text-sm focus:outline-none focus:border-blue-500" />
                    <span>/ {totalPages}</span>
                </div>
                <button onClick={() => changePage(currentPage + 1)} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"><ChevronRight size={18} /></button>
            </div>
            <button onClick={() => selMode ? exitSelection() : enterSelection()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition ${selMode ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                {selMode ? <><X size={13} /> Annuler</> : <><Crop size={13} /> Sélectionner</>}
            </button>
        </div>
    );

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <div className="text-5xl">📄</div>
            <p className="text-base font-medium">Charge un PDF pour commencer</p>
            <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition text-sm">Choisir un PDF</button>
        </div>
    );

    const LoadingState = () => (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm">Chargement…</p>
            </div>
        </div>
    );

    const SelectionOverlay = ({ canvasEl, overlayEl }: { canvasEl: React.RefObject<HTMLCanvasElement | null>, overlayEl: React.RefObject<HTMLCanvasElement | null> }) => {
        const css = canvasToCss(selRect, canvasEl.current);
        return (
            <>
                {selMode && <canvas ref={overlayEl} className="absolute top-0 left-0 rounded" style={{ width: "100%", height: "100%", pointerEvents: "none" }} />}
                {selMode && selRect.w > 0 && selRect.h > 0 && (
                    <div style={{ position: "absolute", left: css.x, top: css.y, width: css.w, height: css.h, border: "2px solid #3b82f6", cursor: "move", pointerEvents: "all", zIndex: 10, boxSizing: "border-box" }}>
                        <div style={{ position: "absolute", top: -24, left: 0, background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none" }}>
                            {Math.round(css.w)} × {Math.round(css.h)}
                        </div>
                        {handles.map((dir) => <div key={dir} style={handleStyle(dir)} data-dir={dir} />)}
                        {showResolve && (
                            <div style={{ position: "absolute", top: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, pointerEvents: "all", zIndex: 30, whiteSpace: "nowrap" }}
                                onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleResolve(); }}
                                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(34,197,94,0.45)", display: "flex", alignItems: "center", gap: 6 }}>
                                    ✓ Résoudre
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); exitSelection(); }}
                                    style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(30,30,30,0.75)", border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {selMode && selRect.w === 0 && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500, pointerEvents: "none", textAlign: "center", padding: "0 16px", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                        Cliquez et faites glisser pour sélectionner
                    </div>
                )}
            </>
        );
    };

    return (
        <MathJaxContext config={mathJaxConfig}>
            <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

                {/* Top bar */}
                <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 bg-white border-b shadow-sm flex-shrink-0">
                    <Link href="/exercices" className="flex items-center gap-1 md:gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition flex-shrink-0">
                        <ArrowLeft size={16} /><span className="hidden sm:inline">Exercices</span>
                    </Link>
                    <div className="w-px h-4 bg-gray-200 hidden sm:block" />
                    <span className="text-sm font-semibold text-gray-700 truncate flex-1 min-w-0">{fileName || "Maths PDF"}</span>
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs md:text-sm px-2.5 md:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex-shrink-0">
                        <span className="hidden sm:inline">Charger un PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadPDF(f); e.target.value = ""; }} />
                </div>

                {/* ─── DESKTOP: two columns, each has its OWN canvas ref ─── */}
                <div className="hidden md:flex flex-1 overflow-hidden">
                    <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 overflow-hidden">
                        <NavBar />
                        <div className="flex-1 overflow-auto flex justify-center bg-gray-200" style={{ padding: pdfDoc ? "24px" : 0 }}>
                            {!pdfDoc && !pdfLoading && <EmptyState />}
                            {pdfLoading && <LoadingState />}
                            {pdfDoc && (
                                <div className="relative select-none" style={{ alignSelf: "flex-start", cursor: selMode ? "crosshair" : "default" }}
                                    onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={processUp} onMouseLeave={processUp}>
                                    <canvas ref={desktopCanvasRef} className="block shadow-xl rounded" style={{ maxWidth: "100%" }} />
                                    <SelectionOverlay canvasEl={desktopCanvasRef} overlayEl={desktopOverlayRef} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-[380px] flex-shrink-0 flex flex-col bg-white overflow-hidden">
                        <PdfAssistantPanel ref={assistantRef} />
                    </div>
                </div>

                {/* ─── MOBILE: tabbed, each tab has its OWN canvas ref ─── */}
                <div className="flex md:hidden flex-col flex-1 overflow-hidden">
                    {/* PDF tab */}
                    <div className="flex-col flex-1 overflow-hidden" style={{ display: mobileTab === "pdf" ? "flex" : "none" }}>
                        <NavBar />
                        <div className="flex-1 overflow-auto flex justify-center bg-gray-200" style={{ padding: pdfDoc ? "16px" : 0 }}>
                            {!pdfDoc && !pdfLoading && <EmptyState />}
                            {pdfLoading && <LoadingState />}
                            {pdfDoc && (
                                <div className="relative select-none" style={{ alignSelf: "flex-start", cursor: selMode ? "crosshair" : "default", touchAction: selMode ? "none" : "auto" }}
                                    onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={processUp} onMouseLeave={processUp}
                                    onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={processUp}>
                                    <canvas ref={mobileCanvasRef} className="block shadow-xl rounded" style={{ maxWidth: "100%" }} />
                                    <SelectionOverlay canvasEl={mobileCanvasRef} overlayEl={mobileOverlayRef} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assistant tab — always mounted so ref is valid */}
                    <div className="flex-col flex-1 bg-white overflow-hidden" style={{ display: mobileTab === "assistant" ? "flex" : "none" }}>
                        <PdfAssistantPanel ref={assistantRef} />
                    </div>

                    {/* Tab bar */}
                    <div className="flex-shrink-0 bg-white border-t border-gray-200 flex">
                        <button onClick={() => setMobileTab("pdf")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition ${mobileTab === "pdf" ? "text-blue-600 border-t-2 border-blue-600 -mt-px" : "text-gray-500"}`}>
                            <FileText size={20} /><span>PDF</span>
                        </button>
                        <button onClick={() => setMobileTab("assistant")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition ${mobileTab === "assistant" ? "text-green-600 border-t-2 border-green-600 -mt-px" : "text-gray-500"}`}>
                            <Bot size={20} /><span>Assistant</span>
                        </button>
                    </div>
                </div>
            </div>
        </MathJaxContext>
    );
}