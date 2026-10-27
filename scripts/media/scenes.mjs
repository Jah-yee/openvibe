// The README recordings. Each scene: optional setup (not recorded), play (recorded).

/** Right-click the canvas, "Lancer 4 agents": a group of four Claude Code sessions boots. */
export const launch = {
  async setup(d, sleep) {
    await d.move(760, 560, 10);
    await sleep(300);
  },
  async play(d, sleep) {
    await sleep(700);
    await d.move(640, 440, 700);
    await sleep(250);
    await d.click(null, { button: "right" });
    await sleep(900);
    const four = await d.at('button[aria-label="Lancer 4 agents"]');
    await d.move(four.x, four.y, 650);
    await sleep(900);
    await d.click();
    await sleep(800);
    await d.move(980, 620, 900);
    await sleep(9500);
  },
};

/** Starts a named group of Claude agents on `model` (setup only, not recorded). */
export async function team(d, sleep, { name = "Frontend", role = "frontend", names = ["Athéna", "Hermès", "Apollon"], model = "claude-haiku-5-5" } = {}) {
  await d.eval(`(async () => {
    const { launchGroup } = await import("/src/fleet/groups.ts");
    const { defaultLaunchOptions } = await import("/src/fleet/launchAgent.ts");
    const options = defaultLaunchOptions();
    const names = ${JSON.stringify(names)};
    return launchGroup({ name: ${JSON.stringify(name)}, role: ${JSON.stringify(role)}, agents: names.map(() => "claude") }, options, undefined, {
      pantheon: "greek", names, cwds: names.map(() => options.cwd), models: names.map(() => ${JSON.stringify(model)}),
    });
  })()`);
  await sleep(12000);
}

/** "@frontend" + a question: the group's three agents work at once, then come back ready. */
export const broadcast = {
  async setup(d, sleep) {
    await team(d, sleep);
    await panel(d, sleep, false);
    await fit(d, sleep, 0.88);
    await d.move(900, 760, 10);
  },
  async play(d, sleep) {
    await sleep(600);
    await d.click(await d.at('textarea[placeholder^="Consigne"]', null, { fx: 0.3 }), { ms: 700 });
    await sleep(400);
    await d.type("@fron", 9);
    await sleep(900);
    await d.key("Tab");
    await sleep(500);
    await d.type("In one sentence, what does src/cart.ts do?", 20);
    await sleep(700);
    await d.key("Enter");
    await sleep(1500);
    await d.move(1000, 640, 900);
    await sleep(11000);
  },
};

/** Shows or hides the Agents panel. */
export async function panel(d, sleep, open) {
  const isOpen = await d.eval(`!!document.querySelector('[aria-label="Fermer le panneau"]')`);
  if (isOpen !== open) {
    await d.eval(`document.querySelector('[aria-label="${open ? "Agents" : "Fermer le panneau"}"]').click()`);
    await sleep(400);
  }
}

/** Fits the view to the whole scene. */
export async function fit(d, sleep, factor = 0.9, maxZoom = 1, dy = 0, keep = "true", dx = 0) {
  await d.eval(`(async () => {
    const { canvasStore } = await import("/src/canvas/canvasStore.ts");
    const api = canvasStore.getState().api;
    const els = api.getSceneElements().filter((e) => ${keep});
    const x0 = Math.min(...els.map((e) => e.x)), y0 = Math.min(...els.map((e) => e.y));
    const x1 = Math.max(...els.map((e) => e.x + e.width)), y1 = Math.max(...els.map((e) => e.y + e.height));
    const { width, height } = api.getAppState();
    const z = Math.min(${maxZoom}, (${factor} * width) / (x1 - x0), (${factor} * (height - 160)) / (y1 - y0));
    const cx = (x0 + x1) / 2 - ${dx} / z, cy = (y0 + y1) / 2 - ${dy} / z;
    api.updateScene({ appState: { zoom: { value: z }, scrollX: width / (2 * z) - cx, scrollY: height / (2 * z) - cy } });
  })()`);
  await sleep(500);
}

/** After the targets, "/" lists Claude Code's commands; /context runs in every agent of the group. */
export const commands = {
  async setup(d, sleep) {
    await d.move(1000, 640, 10);
  },
  async play(d, sleep) {
    await sleep(600);
    await d.click(await d.at('textarea:not(.xterm-helper-textarea)', null, { fx: 0.5 }), { ms: 700 });
    await sleep(400);
    await d.type("/", 6);
    await sleep(1600);
    await d.type("cont", 7);
    await sleep(1200);
    await d.key("Enter");
    await sleep(700);
    await d.key("Enter");
    await sleep(1200);
    await d.move(1060, 600, 800);
    await sleep(7000);
  },
};

/** Ctrl+P to an agent, Ctrl+Shift+P "Revue des changements", a remark on a diff line, ready to send. */
export const review = {
  async setup(d, sleep) {
    await team(d, sleep);
    await d.key("Shift+Escape");
    await fit(d, sleep, 0.88);
    await d.move(1000, 640, 10);
  },
  async play(d, sleep) {
    await sleep(800);
    await d.key("Ctrl+P");
    await sleep(700);
    await d.type("herm", 7);
    await sleep(900);
    await d.key("Enter");
    await sleep(1500);
    await d.key("Ctrl+Shift+P");
    await sleep(700);
    await d.type("revue", 7);
    await sleep(900);
    await d.key("Enter");
    await sleep(1800);
    const line = await d.at("span.whitespace-pre", "discountFor(coupon));", { fx: 0.4 });
    await d.click(line, { ms: 800 });
    await sleep(700);
    await d.type("Clamp the discount so a total can never go negative.", 18);
    await sleep(600);
    await d.key("Enter");
    await sleep(1000);
    const send = await d.at("button", "Envoyer à").catch(() => null);
    if (send) await d.move(send.x, send.y, 900);
    await sleep(2500);
  },
};

/** Picks one icon from the library: category, search, click (inserted at the view's center). */
async function icon(d, sleep, category, query, slot = 0) {
  await d.key("Escape");
  await sleep(250);
  await d.click(await d.at('button[aria-label="Icônes"]'), { ms: 550 });
  await sleep(800);
  if (category) {
    await d.click(await d.at("[data-radix-popper-content-wrapper] button, [role=dialog] button", category), { ms: 500 });
    await sleep(500);
  }
  await d.click(await d.at('input[placeholder^="Chercher une"]'), { ms: 450 });
  await sleep(150);
  await d.type(query, 12);
  await sleep(800);
  const hits = await d.eval(`[...document.querySelector('input[placeholder^="Chercher une"]').closest("[role=dialog]").querySelectorAll("button")].filter(b => b.querySelector("img, svg, canvas")).map(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.textContent.trim() }; })`);
  if (!hits.length) throw new Error("no icon for " + query);
  await d.click(hits[slot], { ms: 600 });
  await sleep(900);
}

/** An architecture sketch from the community libraries: API Gateway → Lambda → DynamoDB, then arrows. */
export const icons = {
  async setup(d, sleep) {
    await d.eval(`(async () => {
      const { canvasStore } = await import("/src/canvas/canvasStore.ts");
      canvasStore.getState().api.updateScene({ appState: { zoom: { value: 1 }, scrollX: 0, scrollY: 0 } });
    })()`);
    await d.move(900, 650, 10);
  },
  async play(d, sleep) {
    await sleep(700);
    await icon(d, sleep, "AWS", "api gateway");
    await d.drag({ x: 720, y: 440 }, { x: 460, y: 440 }, 800);
    await sleep(500);
    await icon(d, sleep, null, "lambda");
    await sleep(300);
    await icon(d, sleep, null, "dynamodb");
    await d.drag({ x: 720, y: 440 }, { x: 980, y: 440 }, 800);
    await sleep(600);
    await d.key("Escape");
    await d.click({ x: 760, y: 700 }, { ms: 400 });
    await d.key("A");
    await sleep(300);
    await d.drag({ x: 537, y: 440 }, { x: 643, y: 440 }, 700);
    await sleep(300);
    await d.key("A");
    await sleep(300);
    await d.drag({ x: 797, y: 440 }, { x: 903, y: 440 }, 700);
    await sleep(400);
    await d.key("Escape");
    await d.move(860, 640, 700);
    await sleep(1800);
  },
};
