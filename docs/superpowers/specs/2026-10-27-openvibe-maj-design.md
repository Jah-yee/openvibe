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

## 2. Remote Control sur plusieurs terminaux (`feat/remote-control`)

**Demande** : « Permettre d'activer le remote-control sur plusieurs terminaux, à l'unité ou au travers de l'orchestrateur, pour gérer et avoir accès aux workflows à distance. »

**Comportement**

- Chaque session Claude (agent ou orchestrateur) a un téléphone dans son en-tête. Le menu propose « Activer Remote Control » ou « Couper Remote Control », puis « Copier le lien » et « Ouvrir dans le navigateur » quand le lien est connu. L'icône est orange quand c'est actif, clignote pendant la connexion, devient rouge en cas d'échec ; le panneau Agents montre aussi un téléphone à côté des agents suivis.
- Le choix est retenu dans le terminal : une session qui a Remote Control démarre avec `claude … --remote-control "<prénom>"` (à la fin de la ligne, le nom étant facultatif). OpenVibe lit alors le lien sur l'écran.
- Sur une session en cours, OpenVibe tape `/remote-control` et lit la réponse : « /remote-control is active » et le lien. Pour couper, il tape `/remote-control`, ce qui ouvre le menu de Claude (« Disconnect this session », « Show QR code », « Continue »), remonte jusqu'à « Disconnect this session » en vérifiant la ligne surlignée, puis valide. Il attend « Remote Control disconnected. ». Vérifié dans l'app avec Claude Code 2.1.304 : démarrage avec le drapeau, coupure, réactivation, nouvelle coupure.
- Le menu d'un groupe a « Activer / Couper Remote Control » pour ses agents. Le menu de l'orchestrateur a « Remote Control pour l'équipe » et « Couper Remote Control » (lui et ses agents reliés).
- L'orchestrateur a un outil `remote_control` (`actif`, `agents` : prénoms, « tous », « moi »). Il rend les liens, pour que l'utilisateur pilote l'équipe depuis son téléphone à travers l'orchestrateur.

**Décisions**

- OpenVibe ne suit que ce qu'il a fait lui-même : un `/remote-control` tapé à la main (ou envoyé par `@tous /remote-control`) n'allume pas le téléphone.
- Si l'écran ne dit pas que la session est connectée, « Couper » tape quand même `/remote-control` ; si cela l'allume, il le retape pour ouvrir le menu et la couper. Mieux vaut deux commandes qu'une session restée ouverte.
- Le premier usage de Remote Control sur un compte affiche un dialogue de consentement (« Enable Remote Control ») : OpenVibe ne l'accepte jamais à la place de l'utilisateur, il attend 20 s puis signale l'absence de confirmation.
