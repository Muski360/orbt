import styles from "@/components/workspace/workspace.module.css";

export default function Loading() {
  return <div className={styles.loading} role="status">Carregando sua órbita…</div>;
}
