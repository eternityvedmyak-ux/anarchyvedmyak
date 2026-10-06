import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "data", "orders.json");

function read() {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* ignore */
  }
  return [];
}

function writeAll(arr) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), "utf8");
}

export function listOrders() {
  return read();
}

export function getOrder(id) {
  return read().find((o) => o.id === id);
}

export function createOrder(data) {
  const all = read();
  const id = "E1-" + Date.now().toString(36).toUpperCase();
  const order = {
    id,
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  all.push(order);
  writeAll(all);
  return order;
}

export function markPaid(id) {
  const all = read();
  const o = all.find((x) => x.id === id);
  if (o) {
    o.status = "paid";
    o.paidAt = new Date().toISOString();
    writeAll(all);
  }
  return o;
}
