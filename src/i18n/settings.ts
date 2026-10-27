import { toast } from "sonner";
import { getSetting, setSetting } from "@/ipc/db";
import { call } from "@/ipc/invoke";
import { langStore, readLanguageChoice, resolveLang, systemLanguage, type Lang, type LanguageChoice } from "./index";

const KEY = "ui.language";

function apply(choice: LanguageChoice): Lang {
  const lang = resolveLang(choice, systemLanguage());
  langStore.setState({ choice, lang });
  document.documentElement.lang = lang;
  return lang;
}

/** Rust writes its own messages in the interface's language. */
const tellRust = (lang: Lang) => call<void>("set_language", { lang }).catch((error: unknown) => console.warn(`language not sent to Rust: ${String(error)}`));

/** At boot. An unreadable choice falls back to Windows' language. */
export async function loadLanguage() {
  let choice: LanguageChoice = "system";
  try {
    choice = readLanguageChoice(await getSetting<unknown>(KEY));
  } catch (error) {
    console.warn(`language setting: ${String(error)}`);
  }
  await tellRust(apply(choice));
}

/** « Langue » of the settings menu and the palette: applies at once, then saves. */
export async function setLanguage(choice: LanguageChoice) {
  const lang = apply(choice);
  await Promise.all([
    setSetting(KEY, choice).catch((error: unknown) => {
      toast.error(String(error));
    }),
    tellRust(lang),
  ]);
}
