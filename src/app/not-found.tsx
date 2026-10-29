import Link from "next/link";
import styles from "@/components/workspace/workspace.module.css";

export default function NotFound() {
  return <main className={styles.errorPage}><h1>Fora de órbita.</h1><p>Esta página não existe ou não está disponível para sua conta.</p><Link className={styles.primaryButton} href="/projetos">Voltar aos projetos ↗</Link></main>;
}
