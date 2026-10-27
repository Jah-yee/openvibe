import { connect } from "./lib.mjs";
const path = process.argv[2];
const d = await connect();
console.log(await d.eval(`(async () => {
  const inv = window.__TAURI_INTERNALS__.invoke;
  const list = await inv("list_projects");
  let p = list.find((x) => x.path.toLowerCase() === ${JSON.stringify(path)}.toLowerCase());
  if (!p) p = await inv("create_project", { path: ${JSON.stringify(path)} });
  await inv("open_project", { id: p.id });
  setTimeout(() => location.reload(), 100);
  return p;
})()`));
d.close();
