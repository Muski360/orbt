import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/workspace/login-form";
import styles from "@/components/workspace/workspace.module.css";

export const metadata = { title: "Entrar — ORBT" };

async function LoginContent() {
  if (await currentUser()) redirect("/projetos");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main className={styles.login}>
      <section className={styles.loginIntro} aria-label="ORBT">
        <Link href="/" className={styles.loginBrand}>ORBT <span aria-hidden="true">↖</span></Link>
        <div><Image src="/assets/orbt_isotipo.svg" width={240} height={148} alt="" /><h1>Entre na<br />sua órbita.</h1><p>Seu time, suas ideias e o próximo passo.</p></div>
        <span className={styles.loginFootnote}>O trabalho acontece junto.</span>
      </section>
      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.loginCard}><h2 id="login-title">Bom ter você aqui.</h2><p>Entre com a conta criada pelo seu gerente.</p><Suspense fallback={<p role="status">Preparando acesso…</p>}><LoginContent /></Suspense></div>
      </section>
    </main>
  );
}
