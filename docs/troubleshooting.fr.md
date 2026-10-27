# Dépannage

[English version](troubleshooting.md)

Commence par le dialogue **Dépannage** : menu des réglages (la roue dentée), palette de commandes (`Ctrl+K`, puis tape « dépannage ») ou lien en bas de l'accueil. Il montre la version d'OpenVibe, les agents trouvés et leur emplacement, Git, Git Bash et le serveur local, et te donne le diagnostic à copier dans un signalement.

## Windows SmartScreen bloque l'installeur

Les bêtas ne sont pas encore signées. Choisis **Informations complémentaires**, puis **Exécuter quand même**. L'installeur installe pour ton utilisateur seulement (dans `%LOCALAPPDATA%\OpenVibe`) et ne demande pas de droits administrateur. Les mises à jour téléchargées par OpenVibe sont signées, et une mise à jour dont la signature ne correspond pas est refusée.

## Un agent est introuvable

OpenVibe lance les agents (CLI) installés sur ton PC ; il les cherche dans le `PATH` de Windows.

1. Vérifie que l'agent démarre dans une nouvelle fenêtre PowerShell : `claude --version` (ou `codex`, `gemini`…).
2. Dans OpenVibe, clique sur **Vérifier à nouveau** (sur l'accueil, ou dans le dialogue Dépannage). Le `PATH` de Windows est relu : un agent installé pendant qu'OpenVibe tourne est trouvé sans le relancer.
3. Toujours introuvable : `where.exe claude` dans PowerShell montre son dossier. Ce dossier doit être dans le `PATH` de ton compte ou du système (Paramètres Windows → « Modifier les variables d'environnement pour votre compte »).

Claude Code est nécessaire pour l'orchestrateur, les missions et le compteur d'usage. Son installeur officiel, dans PowerShell : `irm https://claude.ai/install.ps1 | iex` (voir [la page d'installation de Claude Code](https://code.claude.com/docs/en/setup)).

## Le compteur d'usage reste vide

Le compteur de la barre du haut lit l'usage de Claude Code par un petit script lancé avec `bash`. Il lui faut **Git Bash**, fourni avec [Git pour Windows](https://git-scm.com/download/win). Le dialogue Dépannage dit si Git Bash est trouvé. Après avoir installé Git, relance OpenVibe.

## « Outils OpenVibe indisponibles » sur un orchestrateur

Un orchestrateur ne démarre qu'avec les outils d'OpenVibe, servis par un serveur local intégré ; sans eux, il pourrait modifier ta branche, donc il ne démarre pas. Clique sur **Réessayer**. Si cela recommence, le dialogue Dépannage montre si le serveur local tourne ; relance OpenVibe, et si cela continue, joins le journal à un signalement.

## Une mission dit que le dépôt n'a pas de commit

Une mission travaille sur des branches git, qui demandent un premier commit. Dans le dossier du projet : `git add -A`, puis `git commit -m "Premier commit"`, et relance la mission.

## Où sont les journaux et les données

- Journaux : `%LOCALAPPDATA%\dev.openvibe.app\logs\openvibe.log`. Ils ne contiennent jamais de jeton, de texte de terminal ni de consigne. **Ouvrir le dossier des journaux** dans le dialogue Dépannage ou le menu des réglages.
- Données (projets, canvas, historique des terminaux) : `%APPDATA%\dev.openvibe.app\openvibe.db`. Avant de mettre à jour sa base, OpenVibe en garde une copie à côté (`openvibe.v<N>-backup.db`). **Ouvrir le dossier des données** dans le dialogue Dépannage.

## Signaler un bug

Dans le dialogue Dépannage, clique sur **Copier le diagnostic**, puis **Signaler un problème** : une nouvelle issue GitHub s'ouvre avec ta version préremplie. Colle le diagnostic et, si tu peux, joins `openvibe.log`. Le diagnostic ne contient ni jeton ni chemin de projet, et ton dossier personnel y apparaît comme `~`.

Problème de sécurité : suis plutôt [SECURITY.md](../SECURITY.md) au lieu d'ouvrir une issue publique.

## Repartir de zéro

1. Ferme OpenVibe.
2. Renomme `%APPDATA%\dev.openvibe.app` (par exemple en `dev.openvibe.app.old`).
3. Lance OpenVibe : il crée une base vide. Tes dossiers de projets ne sont pas touchés ; ajoute-les de nouveau depuis l'accueil.

Pour revenir en arrière, ferme OpenVibe et redonne son nom au dossier.

## Désinstaller

Paramètres Windows → Applications → Applications installées → OpenVibe → Désinstaller. Tes données restent dans `%APPDATA%\dev.openvibe.app`, sauf si tu coches la case du désinstalleur qui supprime les données de l'application, ou si tu supprimes le dossier toi-même ; tes dossiers de projets ne sont jamais touchés.
