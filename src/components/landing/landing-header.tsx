import Image from "next/image";
import Link from "next/link";
import styles from "./landing-header.module.css";

export function LandingHeader() {
  return (
    <header className={styles.header}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <Link className={styles.brand} href="/" aria-label="ORBT — página inicial">
        <Image
          src="/assets/orbt_isotipo.svg"
          width={52}
          height={32}
          alt=""
        />
        <span>ORBT</span>
      </Link>
      <nav aria-label="Navegação principal">
        <Link className={styles.link} href="/login">
          Entrar <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}
