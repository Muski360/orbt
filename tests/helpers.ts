import { expect, type Page } from "@playwright/test";

export async function login(
  page: Page,
  email = "admin@admin.com",
  password = "admin123123",
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: false }).fill(email);
  await page.getByLabel("Senha", { exact: false }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(page).toHaveURL(/\/projetos$/);
}
