"use client";

import Image from "next/image";
import { startTransition, useEffect, useId, useRef, useState } from "react";
import { Accessibility, PointerActivationConstraints } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor, type DragStartEvent, type DragOverEvent, type DragEndEvent } from "@dnd-kit/react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { statuses, type ActionResult, type Status } from "@/lib/types";
import type { BoardTask } from "./types";
import { KanbanColumn } from "./kanban-column";
import { useDragScroll } from "./use-drag-scroll";
import styles from "./kanban-preview.module.css";

const accessibility = Accessibility.configure({
  screenReaderInstructions: { draggable: "Pressione espaço para pegar a tarefa, use as setas para mover e espaço para soltar. Escape cancela. Você também pode usar o campo de status." },
  announcements: {
    dragstart: ({ operation }: DragStartEvent) => `Arrastando ${operation.source?.data.title}.`,
    dragover: ({ operation }: DragOverEvent) => operation.target ? `Destino: ${operation.target.data.label}.` : "Fora de uma coluna.",
    dragend: ({ canceled, operation }: DragEndEvent) => canceled || !operation.target ? "Movimento cancelado." : `Movimento solicitado para ${operation.target.data.label}.`,
  },
});
const sensors = [
  PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Distance({ value: 5 })] }),
  KeyboardSensor.configure({ offset: { x: 256, y: 140 } }),
];

export function KanbanBoard({ title, tasks, onMove, onReset, onOpenTask, fullSize = false }: {
  title: string; tasks: BoardTask[];
  onMove: (id: string, status: Status) => ActionResult | Promise<ActionResult>;
  onReset?: () => void; onOpenTask?: (id: string) => void; fullSize?: boolean;
}) {
  const [optimistic, setOptimistic] = useState<{ source: BoardTask[]; tasks: BoardTask[] } | null>(null);
  const visible = optimistic?.source === tasks ? optimistic.tasks : tasks;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();
  const { ref, edges, scroll, handlers } = useDragScroll(reducedMotion);
  const keyboardDrag = useRef(false);
  const pendingFocus = useRef<{ id: string; control: string } | null>(null);
  const layoutId = useId();
  const done = visible.filter((task) => task.status === "done").length;

  useEffect(() => {
    const focus = pendingFocus.current;
    if (!focus || busy) return;
    ref.current?.querySelector<HTMLElement>(`[data-task="${focus.id}"] ${focus.control}`)?.focus();
    pendingFocus.current = null;
  }, [visible, busy, ref]);

  function moveTask(id: string, status: Status) {
    const task = visible.find((item) => item.id === id);
    if (!task || task.status === status || task.editable === false || busyRef.current) return;
    const focused = document.activeElement;
    const control = keyboardDrag.current || focused?.matches("[data-drag-handle]") ? "[data-drag-handle]" : focused instanceof HTMLSelectElement ? "select"
      : focused instanceof HTMLButtonElement && focused.closest(`[data-task="${id}"]`) ? "button" : null;
    if (control) pendingFocus.current = { id, control };
    const previous = visible;
    busyRef.current = true;
    setBusy(true); setError("");
    setOptimistic({ source: tasks, tasks: visible.map((item) => item.id === id ? { ...item, status } : item) });
    startTransition(async () => {
      try {
        const result = await onMove(id, status);
        if (result.ok) setAnnouncement(`${task.title}: ${statuses.find((column) => column.id === status)?.label}.`);
        else {
          setOptimistic({ source: tasks, tasks: previous });
          setError(result.error ?? "Não foi possível salvar o movimento.");
        }
      } catch {
        setOptimistic({ source: tasks, tasks: previous });
        setError("Não foi possível salvar. Verifique a conexão e tente novamente.");
      } finally { busyRef.current = false; setBusy(false); }
    });
  }

  return <section id="quadro" className={`${styles.preview} ${fullSize ? styles.fullBoard : ""}`} aria-label={fullSize ? "Quadro Kanban do projeto" : "Quadro Kanban de demonstração"} tabIndex={-1}>
    <DragDropProvider plugins={(defaults) => defaults.map((plugin) => plugin === Accessibility ? accessibility : plugin)} sensors={sensors}
      onDragStart={(event) => { keyboardDrag.current = event.nativeEvent instanceof KeyboardEvent; }}
      onDragEnd={(event) => {
        const { source, target } = event.operation;
        const column = statuses.find((item) => item.id === target?.id);
        if (!event.canceled && source && column) void moveTask(String(source.id), column.id);
        keyboardDrag.current = false;
      }}>
      <div className={styles.board} aria-busy={busy}>
        <div className={styles.boardHeader}>
          <div className={styles.project}><span className={styles.projectIcon}><Image src="/assets/orbt_isotipo.svg" width={36} height={22} alt="" /></span><h2>{title}</h2></div>
          {onReset && <button className={styles.resetButton} type="button" disabled={busy} aria-label="Restaurar quadro de exemplo" onClick={() => {
            onReset(); setError(""); setAnnouncement("Quadro de exemplo restaurado.");
            ref.current?.scrollTo({ left: 0, behavior: reducedMotion ? "instant" : "smooth" });
          }}><span aria-hidden="true">↺</span></button>}
        </div>
        <div className={styles.progress} aria-hidden="true"><motion.div initial={false} animate={{ scaleX: visible.length ? done / visible.length : 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }} /></div>
        <LayoutGroup id={layoutId}>
          <motion.div ref={ref} layoutScroll className={styles.viewport} tabIndex={0} role="region" aria-label="Colunas do quadro. Arraste o fundo ou use as setas para navegar." {...handlers}>
            <div className={styles.columns}>{statuses.map((column) => <KanbanColumn key={column.id} column={column} tasks={visible.filter((task) => task.status === column.id)} reducedMotion={reducedMotion} onMove={(id, status) => { void moveTask(id, status); }} busy={busy} onOpenTask={onOpenTask} />)}</div>
          </motion.div>
        </LayoutGroup>
        <div className={styles.boardFooter}>
          <span className={styles.completion}><strong>{done}/{visible.length}</strong> {busy ? "salvando…" : "concluídas"}</span>
          <div className={styles.scrollControls}><button type="button" onClick={() => scroll(-1)} disabled={!edges.left} aria-label="Ver colunas à esquerda">←</button><button type="button" onClick={() => scroll(1)} disabled={!edges.right} aria-label="Ver colunas à direita">→</button></div>
        </div>
      </div>
      <DragOverlay dropAnimation={reducedMotion ? null : { duration: 160, easing: "ease-out" }}>{(source) => <div className={`${styles.task} ${styles.dragOverlay}`}><p>{source.data.title}</p><span>Solte em uma coluna</span></div>}</DragOverlay>
    </DragDropProvider>
    {error && <p role="alert" className={styles.saveError}>{error}</p>}
    <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
  </section>;
}
