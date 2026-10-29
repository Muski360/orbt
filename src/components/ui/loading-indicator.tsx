import styles from "./loading-indicator.module.css";

export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

export function LoadingState({
  label = "Carregando sua órbita…",
  variant = "page",
}: {
  label?: string;
  variant?: "page" | "form" | "projects" | "members" | "board";
}) {
  const skeleton = variant !== "page" && variant !== "form";
  return (
    <div className={styles.loading} data-variant={variant}>
      <div className={styles.message} role="status">
        <Spinner />
        <span>{label}</span>
      </div>
      {skeleton && (
        <div className={styles.skeleton} aria-hidden="true">
          <div className={styles.heading} />
          <div className={styles.items}>
            {Array.from(
              { length: variant === "members" ? 4 : 3 },
              (_, index) => (
                <div className={styles.item} key={index}>
                  <span />
                  <span />
                  <span />
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
