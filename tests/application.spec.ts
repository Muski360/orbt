import { expect, test, type Page, type Request, type BrowserContext } from "@playwright/test";

async function replayAction(context: BrowserContext, request: Request) {
  const headers = request.headers();
  const response = await context.request.post(request.url(), {
    headers: { "next-action": headers["next-action"], "content-type": headers["content-type"], origin: "http://127.0.0.1:3100" },
    data: request.postDataBuffer()!,
  });
  return response.text();
}

async function login(page: Page, email = "admin@admin.com", password = "admin123123") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: false }).fill(email);
  await page.getByLabel("Senha", { exact: false }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(page).toHaveURL(/\/projetos$/);
}

test("protege rotas e informa credenciais inválidas", async ({ page }) => {
  await page.goto("/projetos"); await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-mail", { exact: false }).fill("admin@admin.com");
  await page.getByLabel("Senha", { exact: false }).fill("incorreta");
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("E-mail ou senha inválidos");
});

test("fluxo completo de gerente e membro, persistência e logout", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const suffix = Date.now();
  const name = `E2E Projeto ${suffix}`;
  const memberName = `E2E Pessoa ${suffix}`;
  const email = `e2e-${suffix}@orbt.test`;
  await login(page);
  await page.getByRole("link", { name: "Membros", exact: false }).click();
  await page.getByRole("button", { name: "Cadastrar membro", exact: false }).click();
  let dialog = page.getByRole("dialog", { name: "Cadastrar membro", exact: true });
  await dialog.getByLabel("Nome", { exact: false }).fill(memberName);
  await dialog.getByLabel("E-mail", { exact: false }).fill(email);
  await dialog.getByLabel("Senha inicial", { exact: false }).fill("orbt123456");
  await dialog.getByRole("button", { name: "Cadastrar membro", exact: false }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Projetos", exact: false }).click();
  await page.getByRole("button", { name: "Criar projeto", exact: false }).click();
  dialog = page.getByRole("dialog", { name: "Criar projeto", exact: true });
  await dialog.getByLabel("Nome do projeto", { exact: false }).fill(name);
  await dialog.getByLabel("Descrição").fill("Uma ideia que virou projeto.");
  const projectRequest = page.waitForRequest((request) => request.method() === "POST" && !!request.headers()["next-action"]);
  await dialog.getByRole("button", { name: "Criar projeto", exact: false }).click();
  const createProjectRequest = await projectRequest;
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const projectUrl = page.url();
  await page.getByRole("button", { name: /^Participantes/ }).click();
  dialog = page.getByRole("dialog", { name: "Participantes do projeto", exact: true });
  await dialog.getByLabel("Adicionar ao projeto").selectOption({ label: memberName });
  await dialog.getByRole("button", { name: "Associar membro", exact: false }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Criar tarefa", exact: false }).click();
  dialog = page.getByRole("dialog", { name: "Criar tarefa", exact: true });
  await dialog.getByLabel("Título", { exact: false }).fill("Tarefa persistida");
  await dialog.getByLabel("Descrição").fill("Detalhes para a equipe.");
  await dialog.getByLabel("Responsável", { exact: true }).selectOption({ label: memberName });
  await dialog.getByRole("button", { name: "Criar tarefa", exact: false }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-column="todo"]').getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();
  const handle = page.getByRole("button", { name: "Arrastar Tarefa persistida", exact: true });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-column="doing"]')).toHaveAttribute("data-over", "true");
  await page.keyboard.press("Space");
  await expect(page.locator('[data-column="doing"]').getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();
  await expect(handle).toBeEnabled();
  await expect(handle).toBeFocused();
  await page.reload();
  await expect(page.getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();

  const memberContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  try {
    const memberPage = await memberContext.newPage();
    await login(memberPage, email, "orbt123456");
    await expect(memberPage.getByRole("button", { name: "Criar projeto", exact: false })).toHaveCount(0);
    expect(await replayAction(memberContext, createProjectRequest)).toContain("Apenas o gerente pode realizar esta operação");
    await memberPage.goto(projectUrl);
    const movement = memberPage.waitForRequest((request) => request.method() === "POST" && !!request.headers()["next-action"]);
    await memberPage.getByRole("combobox", { name: "Status de Tarefa persistida" }).selectOption("done");
    const moveRequest = await movement;
    await expect(memberPage.locator('[data-column="done"]').getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();
    await memberPage.reload();
    await expect(memberPage.locator('[data-column="done"]').getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();
    await memberPage.route("**/projetos/*", async (route) => {
      if (route.request().method() === "POST") await route.abort("failed"); else await route.continue();
    });
    await memberPage.getByRole("combobox", { name: "Status de Tarefa persistida" }).selectOption("doing");
    await expect(memberPage.getByRole("alert").filter({ hasText: "Não foi possível salvar. Verifique a conexão e tente novamente." })).toBeVisible();
    await expect(memberPage.locator('[data-column="done"]').getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();
    await memberPage.unroute("**/projetos/*");
    await memberPage.getByRole("button", { name: "Ver tarefa Tarefa persistida" }).click();
    let memberDialog = memberPage.getByRole("dialog", { name: "Detalhes da tarefa", exact: true });
    await memberDialog.getByLabel("Responsável", { exact: true }).selectOption({ label: "Administrador" });
    await memberDialog.getByRole("button", { name: "Salvar alterações", exact: false }).click();
    await expect(memberDialog).not.toBeVisible();
    await expect(memberPage.getByRole("combobox", { name: "Status de Tarefa persistida" })).toBeDisabled();
    expect(await replayAction(memberContext, moveRequest)).toContain("Você só pode alterar tarefas atribuídas a você");
    await memberPage.getByRole("button", { name: "Criar tarefa", exact: false }).click();
    memberDialog = memberPage.getByRole("dialog", { name: "Criar tarefa", exact: true });
    await memberDialog.getByLabel("Título", { exact: false }).fill("Tarefa do membro");
    await memberDialog.getByLabel("Responsável", { exact: true }).selectOption({ label: memberName });
    await memberDialog.getByRole("button", { name: "Criar tarefa", exact: false }).click();
    await expect(memberDialog).not.toBeVisible();
    await memberPage.getByRole("button", { name: "Ver tarefa Tarefa do membro" }).click();
    await memberPage.getByRole("button", { name: "Excluir tarefa", exact: true }).click();
    await memberPage.getByRole("dialog", { name: "Excluir tarefa", exact: true }).getByRole("button", { name: "Confirmar exclusão", exact: false }).click();
    await expect(memberPage.getByRole("button", { name: "Ver tarefa Tarefa do membro" })).toHaveCount(0);
    await page.getByRole("button", { name: "Atualizar", exact: false }).click();
    await expect(page.locator('[data-column="done"]').getByRole("button", { name: "Ver tarefa Tarefa persistida" })).toBeVisible();
    await page.getByRole("button", { name: "Ver tarefa Tarefa persistida" }).click();
    dialog = page.getByRole("dialog", { name: "Detalhes da tarefa", exact: true });
    await dialog.getByLabel("Responsável", { exact: true }).selectOption({ label: memberName });
    await dialog.getByRole("button", { name: "Salvar alterações", exact: false }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: /^Participantes/ }).click();
    dialog = page.getByRole("dialog", { name: "Participantes do projeto", exact: true });
    await dialog.getByRole("button", { name: "Retirar", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Retirar membro", exact: true });
    await confirmation.getByRole("button", { name: "Confirmar retirada", exact: false }).click();
    await expect(confirmation).not.toBeVisible();
    await expect(page.getByText("Sem responsável", { exact: true }).first()).toBeVisible();
    await memberPage.reload();
    await expect(memberPage.getByRole("heading", { name: "Fora de órbita." })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/workspace-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "test-results/workspace-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Ver tarefa Tarefa persistida" }).click();
    dialog = page.getByRole("dialog", { name: "Detalhes da tarefa", exact: true });
    await dialog.getByLabel("Título", { exact: false }).fill("Tarefa revisada");
    await dialog.getByRole("button", { name: "Salvar alterações", exact: false }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Ver tarefa Tarefa revisada" })).toBeVisible();
    await page.getByRole("link", { name: "Todos os projetos", exact: false }).click();
    await page.locator("article").filter({ hasText: name }).getByRole("button", { name: "Editar", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Editar projeto", exact: true });
    await dialog.getByLabel("Descrição").fill("Descrição revisada.");
    await dialog.getByRole("button", { name: "Salvar alterações", exact: false }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Descrição revisada.", { exact: true })).toBeVisible();
    await page.locator("article").filter({ hasText: name }).getByRole("button", { name: "Excluir", exact: true }).click();
    await page.getByRole("dialog", { name: "Excluir projeto", exact: true }).getByRole("button", { name: "Confirmar exclusão", exact: false }).click();
    await expect(page.getByRole("link", { name, exact: false })).toHaveCount(0);
    await page.getByRole("link", { name: "Membros", exact: false }).click();
    await page.locator("article").filter({ hasText: email }).getByRole("button", { name: "Excluir", exact: true }).click();
    await page.getByRole("dialog", { name: "Excluir membro", exact: true }).getByRole("button", { name: "Confirmar exclusão", exact: false }).click();
    await expect(page.getByText(email, { exact: true })).toHaveCount(0);
    const oldCookie = (await page.context().cookies()).find((cookie) => cookie.name === "orbt_session")!;
    await page.getByRole("button", { name: "Sair", exact: false }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.context().addCookies([oldCookie]);
    await page.goto("/projetos"); await expect(page).toHaveURL(/\/login$/);
  } finally { await memberContext.close(); }
});
