import {
  expect,
  test,
  type Request,
  type BrowserContext,
} from "@playwright/test";
import { login } from "./helpers";

async function replayAction(context: BrowserContext, request: Request) {
  const headers = request.headers();
  const response = await context.request.post(request.url(), {
    headers: {
      "next-action": headers["next-action"],
      "content-type": headers["content-type"],
      origin: "http://127.0.0.1:3100",
    },
    data: request.postDataBuffer()!,
  });
  return response.text();
}

test("protege rotas e informa credenciais inválidas", async ({ page }) => {
  for (const route of [
    "/projetos",
    "/membros",
    "/projetos/00000000-0000-4000-8000-000000000000",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("navigation", { name: "Navegação da aplicação" }),
    ).toHaveCount(0);
  }
  await page.getByLabel("E-mail", { exact: false }).fill("admin@admin.com");
  await page.getByLabel("Senha", { exact: false }).fill("incorreta");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/login", async (route) => {
    if (route.request().method() === "POST") await gate;
    await route.continue();
  });
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  try {
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
    const pending = page.getByRole("button", { name: "Aguarde…", exact: true });
    await expect(pending).toBeDisabled();
    await expect(pending.locator("span")).toHaveCSS("animation-name", /turn/);
    await page.screenshot({
      path: "test-results/login-loading.png",
      fullPage: true,
    });
  } finally {
    release();
  }
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "E-mail ou senha inválidos",
  );
});

test("fluxo completo de gerente e membro, persistência e logout", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = Date.now();
  const name = `E2E Projeto ${suffix}`;
  const memberName = `E2E Pessoa ${suffix}`;
  const email = `e2e-${suffix}@orbt.test`;
  await login(page);
  let releaseNavigation!: () => void;
  const navigationGate = new Promise<void>((resolve) => {
    releaseNavigation = resolve;
  });
  await page.route("**/membros*", async (route) => {
    await navigationGate;
    await route.continue();
  });
  const membersLink = page.getByRole("link", { name: "Membros", exact: false });
  await membersLink.click();
  try {
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("status")
            .filter({ hasText: "Carregando membros…" })
            .isVisible()) ||
          (await membersLink.locator('[data-pending="true"]').isVisible()),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/navigation-loading.png",
      fullPage: true,
    });
  } finally {
    releaseNavigation();
  }
  await expect(
    page.getByRole("button", { name: "Cadastrar membro", exact: false }),
  ).toBeVisible();
  await page.unroute("**/membros*");
  await page
    .getByRole("button", { name: "Cadastrar membro", exact: false })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Cadastrar membro",
    exact: true,
  });
  await dialog.getByLabel("Nome", { exact: false }).fill(memberName);
  await dialog.getByLabel("E-mail", { exact: false }).fill(email);
  await dialog.getByLabel("Senha inicial", { exact: false }).fill("orbt123456");
  await dialog
    .getByRole("button", { name: "Cadastrar membro", exact: false })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Projetos", exact: false }).click();
  await page
    .getByRole("button", { name: "Criar projeto", exact: false })
    .click();
  dialog = page.getByRole("dialog", { name: "Criar projeto", exact: true });
  await dialog.getByLabel("Descrição").fill("Uma ideia que virou projeto.");
  await dialog
    .getByRole("button", { name: "Criar projeto", exact: false })
    .click();
  await expect(
    dialog.getByLabel("Nome do projeto", { exact: false }),
  ).toBeFocused();
  await expect(dialog.getByLabel("Descrição")).toHaveValue(
    "Uma ideia que virou projeto.",
  );
  await dialog.getByLabel("Nome do projeto", { exact: false }).fill(name);
  let releaseProject!: () => void;
  const projectGate = new Promise<void>((resolve) => {
    releaseProject = resolve;
  });
  await page.route("**/projetos", async (route) => {
    if (route.request().method() === "POST") await projectGate;
    await route.continue();
  });
  const projectRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && !!request.headers()["next-action"],
  );
  await dialog
    .getByRole("button", { name: "Criar projeto", exact: false })
    .click();
  const createProjectRequest = await projectRequest;
  try {
    await expect(
      dialog.getByRole("button", { name: "Fechar diálogo", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
  } finally {
    releaseProject();
  }
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.unroute("**/projetos");
  const projectUrl = page.url();
  await page.getByRole("button", { name: /^Participantes/ }).click();
  dialog = page.getByRole("dialog", {
    name: "Participantes do projeto",
    exact: true,
  });
  await dialog
    .getByLabel("Adicionar ao projeto")
    .selectOption({ label: memberName });
  await dialog
    .getByRole("button", { name: "Associar membro", exact: false })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Criar tarefa", exact: false })
    .click();
  dialog = page.getByRole("dialog", { name: "Criar tarefa", exact: true });
  await dialog.getByLabel("Título", { exact: false }).fill("Tarefa persistida");
  await dialog.getByLabel("Descrição").fill("Detalhes para a equipe.");
  await dialog
    .getByLabel("Responsável", { exact: true })
    .selectOption({ label: memberName });
  await dialog
    .getByRole("button", { name: "Criar tarefa", exact: false })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .locator('[data-column="todo"]')
      .getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
  ).toBeVisible();
  const handle = page.getByRole("button", {
    name: "Arrastar Tarefa persistida",
    exact: true,
  });
  const grip = (await handle.boundingBox())!;
  const card = (await page
    .locator('[data-column="todo"] [data-task]')
    .boundingBox())!;
  await page.mouse.move(grip.x + 22, grip.y + 22);
  await page.mouse.down();
  await page.mouse.move(grip.x + 102, grip.y + 72, { steps: 12 });
  const ghost = page.locator("[data-dnd-overlay][data-dnd-dragging]");
  await expect(ghost).toBeVisible();
  const overlay = (await ghost.boundingBox())!;
  const floatingGrip = (await ghost.locator("[data-drag-grip]").boundingBox())!;
  expect(Math.abs(overlay.width - card.width)).toBeLessThan(1);
  expect(
    Math.abs(floatingGrip.x + floatingGrip.width / 2 - (grip.x + 102)),
  ).toBeLessThan(2);
  expect(
    Math.abs(floatingGrip.y + floatingGrip.height / 2 - (grip.y + 72)),
  ).toBeLessThan(2);
  await page.screenshot({
    path: "test-results/workspace-drag.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-column="doing"]')).toHaveAttribute(
    "data-over",
    "true",
  );
  await page.keyboard.press("Space");
  await expect(
    page
      .locator('[data-column="doing"]')
      .getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
  ).toBeVisible();
  await expect(handle).toBeEnabled();
  await expect(handle).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
  ).toBeVisible();

  const memberContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    const memberPage = await memberContext.newPage();
    await login(memberPage, email, "orbt123456");
    await expect(
      memberPage.getByRole("button", { name: "Criar projeto", exact: false }),
    ).toHaveCount(0);
    await memberPage.goto("/membros");
    await expect(
      memberPage.getByRole("heading", { name: "Fora de órbita." }),
    ).toBeVisible();
    await expect(memberPage.locator("main")).toHaveCount(1);
    expect(await replayAction(memberContext, createProjectRequest)).toContain(
      "Apenas o gerente pode realizar esta operação",
    );
    await memberPage.goto(projectUrl);
    let releaseMove!: () => void;
    const moveGate = new Promise<void>((resolve) => {
      releaseMove = resolve;
    });
    await memberPage.route("**/projetos/*", async (route) => {
      if (route.request().method() === "POST") await moveGate;
      await route.continue();
    });
    const movement = memberPage.waitForRequest(
      (request) =>
        request.method() === "POST" && !!request.headers()["next-action"],
    );
    await memberPage
      .getByRole("combobox", { name: "Status de Tarefa persistida" })
      .selectOption("done");
    const moveRequest = await movement;
    try {
      await expect(
        memberPage.getByRole("status").filter({ hasText: "Salvando…" }),
      ).toBeVisible();
      await expect(memberPage.locator('[data-saving="true"]')).toHaveAttribute(
        "aria-busy",
        "true",
      );
      await expect(
        memberPage.getByRole("combobox", {
          name: "Status de Tarefa persistida",
        }),
      ).toBeDisabled();
      const savingCard = (await memberPage
        .locator('[data-saving="true"]')
        .boundingBox())!;
      const destination = (await memberPage
        .locator('[data-column="done"]')
        .boundingBox())!;
      expect(savingCard.x).toBeGreaterThanOrEqual(destination.x);
      expect(savingCard.x + savingCard.width).toBeLessThanOrEqual(
        destination.x + destination.width,
      );
      await memberPage.screenshot({
        path: "test-results/board-loading.png",
        fullPage: true,
      });
    } finally {
      releaseMove();
    }
    await expect(
      memberPage
        .locator('[data-column="done"]')
        .getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
    ).toBeVisible();
    await memberPage.reload();
    await memberPage.unroute("**/projetos/*");
    await expect(
      memberPage
        .locator('[data-column="done"]')
        .getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
    ).toBeVisible();
    await memberPage.route("**/projetos/*", async (route) => {
      if (route.request().method() === "POST") await route.abort("failed");
      else await route.continue();
    });
    await memberPage
      .getByRole("combobox", { name: "Status de Tarefa persistida" })
      .selectOption("doing");
    await expect(
      memberPage.getByRole("alert").filter({
        hasText:
          "Não foi possível salvar. Verifique a conexão e tente novamente.",
      }),
    ).toBeVisible();
    await expect(
      memberPage
        .locator('[data-column="done"]')
        .getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
    ).toBeVisible();
    await memberPage.unroute("**/projetos/*");
    await memberPage
      .getByRole("button", { name: "Ver tarefa Tarefa persistida" })
      .click();
    let memberDialog = memberPage.getByRole("dialog", {
      name: "Detalhes da tarefa",
      exact: true,
    });
    await memberDialog
      .getByLabel("Responsável", { exact: true })
      .selectOption({ label: "Administrador" });
    await memberDialog
      .getByRole("button", { name: "Salvar alterações", exact: false })
      .click();
    await expect(memberDialog).not.toBeVisible();
    await expect(
      memberPage.getByRole("combobox", { name: "Status de Tarefa persistida" }),
    ).toBeDisabled();
    expect(await replayAction(memberContext, moveRequest)).toContain(
      "Você só pode alterar tarefas atribuídas a você",
    );
    await memberPage
      .getByRole("button", { name: "Criar tarefa", exact: false })
      .click();
    memberDialog = memberPage.getByRole("dialog", {
      name: "Criar tarefa",
      exact: true,
    });
    await memberDialog
      .getByLabel("Título", { exact: false })
      .fill("Tarefa do membro");
    await memberDialog
      .getByLabel("Responsável", { exact: true })
      .selectOption({ label: memberName });
    await memberDialog
      .getByRole("button", { name: "Criar tarefa", exact: false })
      .click();
    await expect(memberDialog).not.toBeVisible();
    await memberPage
      .getByRole("button", { name: "Ver tarefa Tarefa do membro" })
      .click();
    await memberPage
      .getByRole("button", { name: "Excluir tarefa", exact: true })
      .click();
    await memberPage
      .getByRole("dialog", { name: "Excluir tarefa", exact: true })
      .getByRole("button", { name: "Confirmar exclusão", exact: false })
      .click();
    await expect(
      memberPage.getByRole("button", { name: "Ver tarefa Tarefa do membro" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Atualizar", exact: false }).click();
    await expect(
      page
        .locator('[data-column="done"]')
        .getByRole("button", { name: "Ver tarefa Tarefa persistida" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ver tarefa Tarefa persistida" })
      .click();
    dialog = page.getByRole("dialog", {
      name: "Detalhes da tarefa",
      exact: true,
    });
    await dialog
      .getByLabel("Responsável", { exact: true })
      .selectOption({ label: memberName });
    await dialog
      .getByRole("button", { name: "Salvar alterações", exact: false })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: /^Participantes/ }).click();
    dialog = page.getByRole("dialog", {
      name: "Participantes do projeto",
      exact: true,
    });
    await dialog.getByRole("button", { name: "Retirar", exact: true }).click();
    const confirmation = page.getByRole("dialog", {
      name: "Retirar membro",
      exact: true,
    });
    await confirmation
      .getByRole("button", { name: "Confirmar retirada", exact: false })
      .click();
    await expect(confirmation).not.toBeVisible();
    await expect(
      page.getByText("Sem responsável", { exact: true }).first(),
    ).toBeVisible();
    await memberPage.reload();
    await expect(
      memberPage.getByRole("heading", { name: "Fora de órbita." }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/workspace-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: "test-results/workspace-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Ver tarefa Tarefa persistida" })
      .click();
    dialog = page.getByRole("dialog", {
      name: "Detalhes da tarefa",
      exact: true,
    });
    await dialog.getByLabel("Título", { exact: false }).fill("Tarefa revisada");
    await dialog
      .getByRole("button", { name: "Salvar alterações", exact: false })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ver tarefa Tarefa revisada" }),
    ).toBeVisible();
    const stalePage = await page.context().newPage();
    try {
      await stalePage.goto(projectUrl);
      await stalePage
        .getByRole("button", { name: "Ver tarefa Tarefa revisada" })
        .click();
      await page
        .getByRole("button", { name: "Ver tarefa Tarefa revisada" })
        .click();
      await page
        .getByRole("button", { name: "Excluir tarefa", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Excluir tarefa", exact: true })
        .getByRole("button", { name: "Confirmar exclusão", exact: false })
        .click();
      const staleDialog = stalePage.getByRole("dialog", {
        name: "Detalhes da tarefa",
        exact: true,
      });
      await staleDialog
        .getByLabel("Título", { exact: false })
        .fill("Não deve criar outra tarefa");
      await staleDialog
        .getByRole("button", { name: "Salvar alterações", exact: false })
        .click();
      const unavailable = stalePage.getByRole("dialog", {
        name: "Tarefa indisponível",
        exact: true,
      });
      await expect(unavailable).toBeVisible();
      await expect(
        unavailable.getByRole("button", { name: "Criar tarefa", exact: false }),
      ).toHaveCount(0);
      await expect(stalePage.locator("[data-task]")).toHaveCount(0);
    } finally {
      await stalePage.close();
    }
    await page
      .getByRole("link", { name: "Todos os projetos", exact: false })
      .click();
    await page
      .locator("article")
      .filter({ hasText: name })
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    dialog = page.getByRole("dialog", { name: "Editar projeto", exact: true });
    await dialog.getByLabel("Descrição").fill("Descrição revisada.");
    await dialog
      .getByRole("button", { name: "Salvar alterações", exact: false })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("Descrição revisada.", { exact: true }),
    ).toBeVisible();
    await page
      .locator("article")
      .filter({ hasText: name })
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Excluir projeto", exact: true })
      .getByRole("button", { name: "Confirmar exclusão", exact: false })
      .click();
    await expect(page.getByRole("link", { name, exact: false })).toHaveCount(0);
    await page.getByRole("link", { name: "Membros", exact: false }).click();
    await page
      .locator("article")
      .filter({ hasText: email })
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Excluir membro", exact: true })
      .getByRole("button", { name: "Confirmar exclusão", exact: false })
      .click();
    await expect(page.getByText(email, { exact: true })).toHaveCount(0);
    const oldCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "orbt_session",
    )!;
    let releaseLogout!: () => void;
    const logoutGate = new Promise<void>((resolve) => {
      releaseLogout = resolve;
    });
    await page.route("**/membros", async (route) => {
      if (route.request().method() === "POST") await logoutGate;
      await route.continue();
    });
    await page.getByRole("button", { name: "Sair", exact: false }).click();
    try {
      await expect(
        page.getByRole("button", { name: "Saindo…", exact: true }),
      ).toBeDisabled();
    } finally {
      releaseLogout();
    }
    await expect(page).toHaveURL(/\/login$/);
    await page.context().addCookies([oldCookie]);
    await page.goto("/projetos");
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await memberContext.close();
  }
});
