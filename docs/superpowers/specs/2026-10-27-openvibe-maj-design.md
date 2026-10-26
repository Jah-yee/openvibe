# OpenVibe — mise à jour du 27 octobre 2026

Les six idées de « prochaine mise à jour » du `BACKLOG.md`, faites la nuit du 26 au 27 octobre, chacune sur sa branche `feat/…` fusionnée dans `maj/2026-10-27`. Mathieu dormait : les décisions prises pour lui sont notées dans chaque section, sous « Décisions ». Le design (couleurs, tailles, disposition fine) reste à reprendre avec lui.

## 1. Commandes groupées (`feat/commandes-groupees`)

**Demande** : « Pouvoir via la consigne aux agents exécuter une commande pour plusieurs agents en même temps, type `@athena/zeus/héra /effort ultracode`. »

**Comportement**

- `@a/b/c` cible les trois agents (ou groupes) d'un coup, dans la barre de consigne comme dans le champ d'un orchestrateur. Chaque nom suit les règles de `@` : casse et accents ignorés. Si l'un des noms est inconnu ou ambigu, la mention reste telle quelle dans le texte, comme une mention simple.
- La liste `@` complète le dernier nom tapé : `@thot/ze` propose `@zeus`, et Tab fait des puces de Thot et de Zeus.
- Un texte qui commence par `/` est une commande du CLI de l'agent : il est tapé tel quel, suivi d'Entrée (vérifié dans l'app avec Claude Code 2.1.304 : `/effort`, `/context`, `/remote-control` s'exécutent).
- Après les cibles, `/` ouvre la liste des commandes utiles de Claude Code (`/effort`, `/model`, `/remote-control`, `/compact`, `/clear`, `/context`, `/usage`, `/fast`, `/status`), avec une ligne d'aide. Tab ou Entrée complète, Échap ferme.

**Décisions**

- Une commande `/…` ne part pas aux terminaux sans agent (shell nu, commande personnalisée) : un shell la lancerait comme un programme. Ils sont nommés dans un toast. Les autres agents (Codex, Gemini…) la reçoivent : ils ont leurs propres commandes `/`.
- Un agent qui attend une réponse reste ignoré, comme pour une consigne : l'Entrée validerait le choix de son dialogue.
- Constat : `/effort <niveau>` enregistre aussi ce niveau comme effort par défaut de Claude pour ce modèle (`modelSettings` de `~/.claude/settings.json`). La ligne d'aide le dit. Pendant l'essai, l'effort par défaut d'Opus 5.5 est passé de `xhigh` à `high`, puis il a été remis à `xhigh`.
