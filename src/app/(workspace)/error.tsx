"use client";

import { ErrorMessage } from "@/components/ui/route-feedback";

export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <ErrorMessage retry={retry} />;
}
