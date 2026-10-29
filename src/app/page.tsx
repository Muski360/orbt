import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        <LandingHero />
      </main>
      <footer className={styles.footer}>
        <span>O seu time. Na mesma órbita.</span>
        <span className={styles.footerName}>ORBT © 2026</span>
      </footer>
    </div>
  );
}
