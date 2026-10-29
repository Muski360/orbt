"use client";

import Link from "next/link";
import styles from "@/components/workspace/workspace.module.css";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <main className={styles.errorPage}><h1>Não foi possível carregar.</h1><p>Confira a conexão e tente novamente. Seus dados salvos permanecem no sistema.</p><button className={styles.primaryButton} onClick={retry}>Tentar novamente ↻</button><Link href="/">Voltar ao início</Link></main>;
}
