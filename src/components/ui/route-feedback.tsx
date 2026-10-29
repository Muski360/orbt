import Link from "next/link";
import buttons from "./button.module.css";
import styles from "./route-feedback.module.css";

export function NotFoundMessage() {
  return (
    <div className={styles.message}>
      <h1>Fora de órbita.</h1>
      <p>Esta página não existe ou não está disponível para sua conta.</p>
      <Link className={buttons.primary} href="/projetos">
        Voltar aos projetos ↗
      </Link>
    </div>
  );
}

export function ErrorMessage({ retry }: { retry: () => void }) {
  return (
    <div className={styles.message}>
      <h1>Não foi possível carregar.</h1>
      <p>Confira a conexão e tente novamente.</p>
      <button className={buttons.primary} onClick={retry}>
        Tentar novamente ↻
      </button>
      <Link href="/">Voltar ao início</Link>
    </div>
  );
}
