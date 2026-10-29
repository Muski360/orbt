import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("ação de uma aba antiga redireciona após logout em outra aba", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Criar projeto", exact: false })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Criar projeto",
    exact: true,
  });
  await dialog
    .getByLabel("Nome do projeto", { exact: false })
    .fill("Não deve ser criado após logout");
  const otherPage = await page.context().newPage();
  try {
    await otherPage.goto("/projetos");
    await otherPage.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(otherPage).toHaveURL(/\/login$/);
    await dialog
      .getByRole("button", { name: "Criar projeto", exact: false })
      .click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await otherPage.close();
  }
});

test("preserva os campos e permite tentar novamente após falha de rede", async ({
  page,
}) => {
  await page.goto("/login");
  const email = page.getByLabel("E-mail", { exact: false });
  const password = page.getByLabel("Senha", { exact: false });
  await email.fill("admin@admin.com");
  await password.fill("senha-incorreta");
  await page.route("**/login", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Não foi possível enviar. Verifique a conexão e tente novamente.",
  );
  await expect(email).toHaveValue("admin@admin.com");
  await expect(password).toHaveValue("senha-incorreta");
  await page.unroute("**/login");
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "E-mail ou senha inválidos",
  );
  await expect(email).toHaveValue("admin@admin.com");
  await expect(password).toHaveValue("senha-incorreta");
});

test("validação indica o campo inválido e preserva os outros valores", async ({
  page,
}) => {
  await page.goto("/login");
  const email = page.getByLabel("E-mail", { exact: false });
  const password = page.getByLabel("Senha", { exact: false });
  await email.fill("email-invalido");
  await password.fill("senha-preenchida");
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toBeFocused();
  await expect(password).toHaveValue("senha-preenchida");
  await expect(
    page.getByText("Informe um e-mail válido.", { exact: true }),
  ).toBeVisible();
});
