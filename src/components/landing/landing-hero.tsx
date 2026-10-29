import { KanbanPreview } from "./kanban-preview";
import styles from "./landing-hero.module.css";

export function LandingHero() {
  return (
    <section className={styles.hero} aria-labelledby="titulo-principal">
      <div className={styles.copy}>
        <h1 id="titulo-principal" className={styles.title}>
          Menos caos.
          <br />
          Mais <span>órbita.</span>
        </h1>
        <p className={styles.description}>
          Organize projetos, distribua tarefas e faça as ideias avançarem.
          Seu time inteiro na mesma página.
        </p>
        <a className={styles.cta} href="/login">
          Acessar ORBT <span aria-hidden="true">↗</span>
        </a>
      </div>
      <KanbanPreview />
    </section>
  );
}
