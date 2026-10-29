"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "./loading-indicator";
import styles from "./loading-indicator.module.css";

export function LinkFeedback() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={styles.linkFeedback}
      data-pending={pending || undefined}
      aria-hidden="true"
    >
      {pending ? <Spinner /> : "↗"}
    </span>
  );
}
