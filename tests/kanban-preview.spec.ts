import { expect, test } from "@playwright/test";

test("arrasta tarefas entre colunas e cancela sem perder dados", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const handle = page.getByRole("button", {
    name: "Arrastar Tirar a ideia do papel",
    exact: true,
  });
  const target = page.locator('[data-column="doing"]');
  const sourceBox = (await handle.boundingBox())!;
  const cardBox = (await page.locator('[data-task="idea"]').boundingBox())!;
  const targetBox = (await target.boundingBox())!;

  await page.mouse.move(sourceBox.x + 22, sourceBox.y + 22);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 32, sourceBox.y + 22);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 200, {
    steps: 20,
  });
  await expect(target).toHaveAttribute("data-over", "true");
  const overlay = page.locator("[data-dnd-overlay][data-dnd-dragging]");
  const ghostBox = (await overlay.boundingBox())!;
  const ghostGrip = (await overlay.locator("[data-drag-grip]").boundingBox())!;
  expect(Math.abs(ghostBox.width - cardBox.width)).toBeLessThan(1);
  expect(Math.abs(ghostBox.height - cardBox.height)).toBeLessThan(1);
  expect(
    Math.abs(
      ghostGrip.x + ghostGrip.width / 2 - (targetBox.x + targetBox.width / 2),
    ),
  ).toBeLessThan(2);
  expect(
    Math.abs(ghostGrip.y + ghostGrip.height / 2 - (targetBox.y + 200)),
  ).toBeLessThan(2);
  await expect(page.locator("body")).toHaveCSS("cursor", "grabbing");
  await expect(target.getByText("Soltar em Em Andamento")).toBeVisible();
  await page.screenshot({
    path: "test-results/drag-desktop.png",
    fullPage: true,
  });
  await page.mouse.up();
  await expect(target.locator('[data-task="idea"]')).toHaveCount(1);
  await expect(page.locator("[data-task]")).toHaveCount(4);

  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator('[data-task="idea"]')).toHaveAttribute(
    "data-dragging",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(target.locator('[data-task="idea"]')).toHaveCount(1);
  await expect(page.locator("[data-task]")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("permite mover pelo teclado e pelo campo de status, atualiza contagens e restaura o exemplo", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const handle = page.getByRole("button", {
    name: "Arrastar Tirar a ideia do papel",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator('[data-task="idea"]')).toHaveAttribute(
    "data-dragging",
    "true",
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-column="doing"]')).toHaveAttribute(
    "data-over",
    "true",
  );
  await page.keyboard.press("Space");
  await expect(
    page.locator('[data-column="doing"] [data-task="idea"]'),
  ).toHaveCount(1);
  await expect(handle).toBeFocused();

  for (const id of ["idea", "references", "identity", "team"]) {
    const select = page.locator(`[data-task="${id}"] select`);
    await select.focus();
    await select.selectOption("done");
    await expect(
      page.locator(`[data-column="done"] [data-task="${id}"]`),
    ).toHaveCount(1);
    await expect(page.locator(`[data-task="${id}"] select`)).toBeFocused();
  }
  await expect(page.locator('[data-column="done"] [data-task]')).toHaveCount(4);
  await expect(page.locator("#quadro")).toContainText("4/4");
  await page
    .getByRole("button", { name: "Restaurar quadro de exemplo" })
    .click();
  await expect(page.locator('[data-column="todo"] [data-task]')).toHaveCount(2);
  await expect(page.locator('[data-column="doing"] [data-task]')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-column="done"] [data-task]')).toHaveCount(1);
});

test("desliza o fundo e navega pelas setas sem transbordar a página", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const viewport = page.getByRole("region", { name: /^Colunas do quadro/ });
  await expect(viewport).toHaveCSS("cursor", "grab");
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + 200, box.y + 35);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 35, { steps: 15 });
  await page.mouse.up();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(100);
  const right = page.getByRole("button", { name: "Ver colunas à direita" });
  await right.click();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(350);
  await page
    .getByRole("button", { name: "Restaurar quadro de exemplo" })
    .click();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBe(0);

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/orbt-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/orbt-mobile.png",
    fullPage: true,
  });
});

test("permite deslizar o quadro e arrastar pela alça com toque", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100");
    const viewport = page.getByRole("region", { name: /^Colunas do quadro/ });
    await viewport.scrollIntoViewIfNeeded();
    const session = await context.newCDPSession(page);
    async function swipe(
      from: { x: number; y: number },
      to: { x: number; y: number },
    ) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [from],
      });
      for (let step = 1; step <= 16; step++) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: from.x + ((to.x - from.x) * step) / 16,
              y: from.y + ((to.y - from.y) * step) / 16,
            },
          ],
        });
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(120);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }

    const box = (await viewport.boundingBox())!;
    await swipe(
      { x: box.x + 230, y: box.y + 35 },
      { x: box.x + 30, y: box.y + 35 },
    );
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(100);
    await page
      .getByRole("button", { name: "Restaurar quadro de exemplo" })
      .tap();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBe(0);

    const handle = page.getByRole("button", {
      name: "Arrastar Tirar a ideia do papel",
      exact: true,
    });
    const handleBox = (await handle.boundingBox())!;
    const currentBox = (await viewport.boundingBox())!;
    await swipe(
      { x: handleBox.x + 22, y: handleBox.y + 22 },
      { x: currentBox.x + currentBox.width - 20, y: handleBox.y + 35 },
    );
    await expect(
      page.locator('[data-column="doing"] [data-task="idea"]'),
    ).toHaveCount(1);
    await expect(page.locator("[data-task]")).toHaveCount(4);
  } finally {
    await context.close();
  }
});
