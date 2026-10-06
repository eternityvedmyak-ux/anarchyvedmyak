import fs from "fs";
import path from "path";
import { siteConfig as defaults } from "./siteConfig";

const file = path.join(process.cwd(), "data", "site.json");

export function getConfig() {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (e) {
    // при ошибке чтения — возвращаем значения по умолчанию
  }
  return defaults;
}

export function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2), "utf8");
}
