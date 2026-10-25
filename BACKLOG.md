# Backlog OpenVibe

Ce qui est reporté. La spec en cours est `docs/superpowers/specs/2026-10-24-openvibe-habillage-et-flotte-design.md` (habillage Symvibe et flotte d'agents). Les références « vidéo » renvoient aux démos de Symvibe analysées le 2026-10-24.

## Fonctionnalités inspirées de Symvibe

### Widgets du canvas (remplacent les nœuds Note, Kanban et Git Watcher de la spec V1)

- **Kanban « Board »** : colonnes éditables avec compteur et menu, état vide, ajout de colonne ; fenêtre « Nouvelle carte » (titre, notes, échéance Aujourd'hui / Demain / Semaine prochaine ou date, priorité Aucune / Basse / Moyenne / Haute) ; cartes avec barre de priorité et puces ; glisser entre colonnes ; glisser une carte vers un terminal (spec V1 §6.9). Vidéo : node-kanban.
- **Calendrier** : grille mensuelle, aujourd'hui en orange, Nouveau / Aujourd'hui / navigation, fenêtre d'événement (date, journée entière, 6 couleurs, notes), glisser un événement d'un jour à l'autre. Vidéo : node-kanban.
- **Checklist d'objectifs** : état vide « Aucun objectif », « Ajouter un objectif ». Vidéo : node-kanban.
- **Post-it** : papier ligné ocre, coin corné, police manuscrite, panneau PAPIER (9 couleurs, ordre, dupliquer, supprimer) ; remplace le nœud Note. Vidéo : node-kanban.
- **Tuile web** : dessinée à la souris ; onglets, navigation, barre d'adresse ; lanceur « Ouvrir une page » avec détection des ports localhost actifs (:3000, :5173…) et accès rapide ; préréglages d'écran et de téléphone ; pas d'inspecteur par tuile sous WebView2. Vidéo : node-webtiles.
- **Icônes cloud** (spec V1 §7) : import des packs officiels AWS, Azure, GCP, recherche et insertion ; migration ultérieure pour les tables `icon_packs` et `icons`.

### Git

- **Fenêtre git** depuis la puce de branche : liste des changements avec cases, statut, +/−, annuler un fichier ; message de commit (avec génération par un agent) ; « Commit & Push N fichiers » avec états Lecture → Commit → Push → arbre propre ; historique (hash, auteur, date). Vidéo : node-git.
- Diff d'un fichier au clic (reprend le Git Watcher de la spec V1 §6.8).

### Studios (modales ouvertes depuis le rail droit)

- **Code** : arbre du dépôt, éditeur coloré (CodeMirror), Enregistrer, « Insérer » qui pose un nœud fichier sur le canvas. Vidéo : studio-code.
- **Markdown** : arbre `docs/`, vues Lecture / Source / Graphe de liens, « Ajouter au board », export PDF ; nœud avec « Ouvrir dans le studio ». Vidéo : studio-markdown.
- **Documents** : document rédigé par un agent CLI (modèle, effort Rapide / Équilibré / Approfondi, flux en direct, Stop), rendu « papier », export PDF. Vidéo : studio-documents.
- **Diagrammes** : l'agent dessine des éléments Excalidraw natifs (modèle, style Encre / Coloré, presets « Architecture », « Flux de données »…, prompt, formes de départ). Vidéo : studio-diagrams.

### Automatisation

- **Boucles** : consignes récurrentes (planning, agent devenu inactif, sortie contenant un texte), cibles, conditions d'arrêt (nombre, durée, objectif atteint par commande ou agent juge), arrière-plan, modèles (Point d'avancement, Relance, Sauvetage de build, Surveillance des tests, Commit régulier, Revue, Standup). Vidéo : node-loops.
- **Mémoire** : faits par dépôt ou globaux (Architecture, Structure, Commandes, Conventions, Pièges, Contexte), scan du dépôt par un agent jetable avec revue, éditeur, carte mémoire posée sur le board et poussée aux consoles reliées. Vidéo : node-memory.
- **Carte de mission** : arbre Orchestrateur → Équipe → consoles, filtres par état, recherche, inspecteur (aller à la console, pause, fermer, cadrer l'équipe). Vidéo : teams.
- **Presets d'équipes** : déployer une topologie complète (plusieurs groupes, orchestrateur, tuile web), ex. « Dev HQ ». Vidéo : voice.
- **Menu Outils** (mallette de la barre du haut) regroupant ces entrées.

### Comptes et quotas

- **Usage** : jauge de la session Claude, limites hebdomadaires, heure de réinitialisation dans la barre du haut, carte d'activité, statistiques. Vidéo : node-usage.
- **Tokens** : lecture des logs locaux de Claude et Codex, graphe sur 30 jours, détail par agent. Vidéo : node-usage.
- **Comptes** : profils Claude (CLAUDE_CONFIG_DIR par profil), « Utiliser », connexion dans un terminal, puce de compte dans l'en-tête des terminaux. Vidéo : node-accounts.

### Voix et directeur IA

- Maintenir Espace pour parler (reconnaissance locale, Whisper ou équivalent : WebView2 n'en fournit pas hors ligne), forme d'onde, « J'écoute » / « Je réfléchis ».
- Directeur IA : interprète la demande et agit sur le canvas (créer des groupes, relier un orchestrateur, déployer un preset, fermer avec confirmation), fil de discussion dépliable avec lignes « Plan ». Vidéo : voice.

### Interface

- Thème clair.
- Halo lumineux et impulsion animée sur les liaisons, poignées de sélection rondes (couche décorative ou patch d'Excalidraw).
- Replier un groupe sur son étiquette.
- Réglages complets (agent par défaut, seuil d'activité, raccourcis), réordonner les onglets par glisser (`reorder_workspaces`).
- Gemini CLI : états précis par ses hooks (BeforeAgent, AfterAgent, Notification).

## Points mineurs reportés du plan 2

- Un rattachement raté devrait revenir à l'écran sauvegardé (`restoreSession`) et retirer le nœud des sessions vivantes à `pty-exit` ; le recalage avant rattachement marque le terminal comme actif.
- Les échecs de sauvegarde différée sont des rejets non gérés (aucun toast).
- Le sauvegardeur périodique (10 s) peut écraser l'historique final d'un terminal avec un instantané plus ancien.
- Un `pty-exit` tardif d'un ancien processus peut marquer un terminal relancé comme terminé (ajouter le pid à l'événement).
- Un mutex de base empoisonné après une panique désactive la persistance pour la session.
- `tauri-plugin-log` (logs Rust dans un fichier).
- CSP de la webview à `null` : à corriger avant d'afficher du contenu externe (tuile web, studios).
- Noms de workspace en double autorisés.

## Constats du plan A (relecture finale)

- Les agents lancés depuis un OpenVibe démarré dans une session Claude Code héritent de son marqueur de session enfant (`CLAUDE_CODE_CHILD_SESSION`…) : Claude n'enregistre pas les conversations et « Reprendre » échoue. Retirer ces marqueurs de l'environnement des terminaux (la spec V1 dit que les terminaux héritent de l'environnement).
- `restoreSession` ne pose pas la garde `replaying` : une relance pendant la restauration d'un long écran peut envoyer au nouveau processus les réponses de xterm aux anciennes requêtes.
- `list_projects` teste l'existence des dossiers en tenant le verrou de la base (un lecteur réseau hors ligne bloquerait toutes les commandes).
- Restes de « Terminal introuvable » : copie d'un terminal dont la source n'est plus en mémoire ; copie pendant son adoption ; une image « ARRÊTÉ » avant le montage d'un nouveau terminal.
- La couleur de sélection passe par le filtre sombre (≈ `#ea6b40` au lieu de `#f4602e`).
- Les modes zen et lecture (Alt+Z, Alt+R) n'ont plus de bouton de sortie visible.
- Carte d'un projet introuvable : « Renommer » reste proposé ; la confirmation de suppression d'un workspace donne un nombre d'agents, pas leur liste ; le bouton Formes ne garde pas la dernière forme comme outil.
- Le sélecteur de projet rouvre le projet déjà actif, sans gestion d'erreur.
- « Nouvelle console » lance un Shell si on clique avant que la liste des agents soit chargée.
- Ouvrir le menu Stylo réécrit la couleur et l'épaisseur courantes partagées avec les formes.
- Les prénoms des terminaux fermés (encore en mémoire pour Ctrl+Z) ne sont réutilisés qu'au redémarrage.
- Sauvegarde automatique de la base (`openvibe.vN-backup.db`) avant chaque migration (à faire avec la migration du plan B).

## Constats du plan B1 (groupes, relecture finale)

- Après une action dans nos menus ou puces (Dégrouper, Fermer le groupe, Lancer 4…), les raccourcis d'Excalidraw (Ctrl+Z en tête) ne répondent qu'après un clic sur le canvas : Excalidraw n'écoute le clavier que dans son conteneur (`handleKeyboardGlobally` désactivé). Piste : rendre le focus au conteneur d'Excalidraw après nos actions (le mode global ferait agir Suppr tapé dans nos menus sur la sélection).
- Ctrl+D ou copier-coller d'un groupe entier garde son panthéon : deux groupes partagent alors les mêmes prénoms ; la première copie adoptée dans un cadre dupliqué prend un prénom hors groupe.
- Un agent ajouté hors de la vue (Ajouter un agent ou Dupliquer vers une nouvelle ligne ou colonne) ne s'affiche ni ne démarre avant qu'on fasse défiler jusqu'à lui (Excalidraw ne monte un nœud qu'une fois visible) : faire défiler la vue vers lui.
- Seul le nom natif sert de poignée : saisir l'étiquette par ses compteurs ou son vide lance une sélection au lasso.
- Les identifiants de cadres ne passent pas par `CSS.escape` dans les règles de transparence injectées.
- Les terminaux arrêtés avant la mise à jour de la netteté rejouent une fois leur ancien écran dans une grille plus étroite (cellule de base de 8 px arrondie, contre 7 px avec FitAddon) : affichage brouillé jusqu'à la relance.
- Entrée dans le champ nom de « Composer un groupe » ne lance pas le groupe.
- Aucune limite d'erreur React : une erreur de rendu efface toute l'interface jusqu'au rechargement.
- Développement : modifier `Canvas.tsx` pendant que l'application tourne fait remonter `LoadedCanvas` avec sa scène d'origine (Fast Refresh), qui est alors enregistrée par-dessus la scène courante (nœuds purgés) ; l'observateur de Vite manque parfois des modifications rapprochées (toucher le fichier).

## Constats du plan B2 (états des agents, relecture finale)

- Une relance refusée pour un nœud qui tourne déjà (« tourne déjà ») efface quand même son suivi d'activité et son fichier de réglages : `pty_spawn` appelle `started`, puis `ended` sur l'erreur, avant le contrôle. Piste : sortir tôt quand le nœud tourne.
- L'instantané chargé au démarrage peut écraser un événement plus récent, et deux fils peuvent émettre dans le désordre (émission après relâche du verrou) : une pastille périmée jusqu'à la transition suivante. Piste : garder l'entrée la plus récente dans `load`, ou numéroter les changements.
- `is_keystroke` n'écarte que le focus et la souris : les réponses du terminal (position du curseur, attributs, OSC, DECRQM) comptent comme des frappes.
- Terminaux sans hooks (Shell, Codex, Gemini…) : l'écho de la frappe et les redessins au redimensionnement comptent comme du travail ; taper dans un Shell allume EN COURS 1,5 s. Piste : ignorer la sortie qui suit une frappe de moins de 200 ms.
- Le dialogue de fermeture dit toujours « tourne encore » ; la spec (§7.5) veut « est en cours » ou « est prête » selon l'activité.
- Le clic sur une ligne du panneau Flotte centre et donne le clavier mais n'active pas l'élément (spec §5.5 « l'active ») : le menu de l'en-tête demande un clic de plus.
- Les compteurs de groupe ne vérifient pas que le processus tourne ; `fleetStateOf` range « en marche sans activité connue » dans Inactifs alors que la pastille dit ACTIF.
- Le verrou du suivi d'activité se prend avec `lock().unwrap()` : un verrou empoisonné figerait tous les terminaux. Piste : `unwrap_or_else(PoisonError::into_inner)`.
- Non traités : un proxy HTTP qui intercepterait `127.0.0.1` (les hooks échouent, l'activité du terminal prend le relais) ; les marqueurs de session Claude Code au-delà des 8 de la spec (`CLAUDE_CODE_SSE_PORT`…) ; un dialogue d'autorisation répondu hors du terminal (IDE, à distance) laisse ATTEND jusqu'au hook suivant.

## Constats du plan B3 (commande et orchestrateur, relecture finale)

- Les liaisons restent en flèches orange orphelines après Dégrouper, Fermer le groupe, la fermeture d'un terminal relié ou la suppression de l'orchestrateur par Suppr (seul × les retire). Piste : supprimer les flèches dont un bout a disparu, dans la même mise à jour.
- Le marquage des flèches tracées à la main peut être programmé plusieurs fois avant de s'appliquer (versions et sauvegardes en trop) : un drapeau « en attente ».
- La molette au-dessus du champ de l'orchestrateur fait défiler le canvas ; le mode « Relier » avale la molette, et son bouton « Terminer » n'est pas cliquable (le calque prend le clic).
- « Relier un orchestrateur » une seconde fois sur le même groupe pose le nouvel orchestrateur sur le premier : réutiliser `clearSpot`.
- « Reprendre » sur une ligne : rejet non géré si le processus vient de mourir ; aucun message.
- Historique : une consigne envoyée avant la fin du chargement écrase l'historique enregistré (fenêtre de quelques millisecondes).
- Envoyer grisé avec « Écris une consigne » quand les puces ne désignent aucun agent (groupe vide).
- Les agents en démarrage échelonné sont annoncés « arrêtés ignorés ».
- Le test Windows de `pty_send_text` vérifie l'effet de la commande, pas les octets écrits.
- Pas de garde de composition IME dans le champ de commande.

## Constats du plan C1 (fenêtre et livraison, relecture finale)

- Deux « Fermer » dans la rangée du haut : la pastille « × Fermer » (ferme le projet) et le bouton de fenêtre (quitte l'application, arrête les agents) ont la même info-bulle. Renommer celle du bouton de fenêtre « Fermer OpenVibe » (comme spec fenêtre §7.3) ; change la spec §4.3.
- Les 8 px entre deux pastilles de la barre du haut ne cliquent ni ne déplacent la fenêtre : rendre les conteneurs `pointer-events-none` et leurs enfants `pointer-events-auto`.
- La bande de déplacement suppose que ProjectView et HomeScreen ne créent pas de contexte d'empilement (TopBar z-30 au-dessus de DragStrip z-20) : le documenter par un commentaire avant que J7/J8 n'y ajoutent `isolate`, transform ou opacity.
- Le test « sits on an opaque pill » de `WindowControls` ne vérifie que des noms de classes : fragile face à la refonte.

## Constats du plan D1 (fondations de l'identité, relecture finale)

- `index.html` garde `<html class="dark">` et la variante Tailwind `dark` vaut `&:is(.dark *)` : les `dark:` de shadcn (boutons outline/ghost, champs, listes) s'appliquent aussi en Ivoire. Retirer la classe et redéfinir la variante sur `[data-theme="dark"]` avant que R2 n'écrive des `dark:`.
- `text-white` sur l'accent à 8 endroits (accueil, menu Agent, saisie de consigne, offre de reprise, orchestrateur, puce git, `ui.tsx`, onglets) au lieu de `text-ov-on-accent` (blanc sur `#D97757` : 3,1:1).
- Le voile des dialogues shadcn (`backdrop-blur-xs`) ignore le réglage « Effets de transparence ».
- Premier affichage : le choix enregistré n'est lu qu'au boot (une image dans le thème de Windows quand le thème est forcé) et, avant le JS, `<html>` n'a pas de `data-theme` (jetons sombres même si Windows est clair).
- Commentaires périmés : « cream strokes » (`sceneDefaults.ts`), « The orange of the wires (spec habillage §13) » (`wires.ts`).
- `hover:brightness-125` des puces (`ChipButton`) sans effet sur le blanc d'Ivoire (les puces disparaissent en R2).
- `cssBlock` prend la première occurrence textuelle d'un sélecteur (dépend de l'ordre des blocs) ; le test du repli opaque vérifie la présence de la requête média, pas que le bloc opaque est dedans.
- `cssBlocks.ts` (aide de test) référence les types Node dans le programme de l'application : déplacer les aides de test sous une configuration TypeScript dédiée.
- `sceneDefaults.ts` (canvas) importe `PEN_COLORS` de `shell/tools` : la palette irait mieux dans `src/theme`.

## Constats du plan D2 (structure façon canvas libre, relecture finale)

- Réglés par R2, parmi les constats D1 : variante `dark` liée à `data-theme` (plus de `class="dark"`), voile des dialogues qui suit « Effets de transparence », puces disparues ; `text-white` sur l'accent ne reste que dans le menu Agent (commande personnalisée) et l'orchestrateur (R3).
- Le logo et le libellé « OpenVibe » de la barre de titre ne déplacent pas la fenêtre (attribut nu) : `data-tauri-drag-region="deep"` sur la barre, les boutons bloquant toujours.
- En build release, le `<style>` injecté par sonner passe après la feuille de l'application : l'ombre de verre des toasts (même spécificité) est remplacée par celle de sonner. Monter la spécificité ou passer l'ombre par `toastOptions.style`, puis vérifier dans l'installateur.
- Un nom de branche long dans la puce git passe sous la barre de consigne en dessous d'environ 1 210 px de large : tronquer (`max-w-[150px] truncate`, nom complet en info-bulle).
- Les calques de pose et de liaison (`fixed inset-0 z-40`) couvrent la barre de titre pendant la pose ou la liaison : « Fermer OpenVibe » et le déplacement n'y répondent pas (antérieur à R2) ; les faire commencer sous `TOP_ROW_HEIGHT`.
- L'offre « Reprendre toutes les conversations ? » peut couvrir le bas du panneau Agents à pleine hauteur (petit écran) jusqu'à la réponse.
- « Ajuster la vue » (`viewportZoomFactor: 0.9`) laisse les bords de la scène sous les barres de 72 px et la bande du bas : à reprendre avec la zone utile de J7.
- Restes d'ancien style dans des fichiers touchés par R2 : liste des mentions de la saisie de consigne opaque (`CommandInput`), boutons en pilule dans les options du menu Agent et dans « Composer un groupe », boutons de fenêtre de 38 px dans une barre de 37 px utiles, pastille d'attente absente du nom accessible du bouton Agents.
- Le filtre du panneau reste celui posé par un compteur quand le panneau est rouvert depuis le rail (l'état vide l'annonce désormais : « Aucun agent dans ce filtre »).
- Lignes d'agent du panneau (actions au survol Centrer, Pause/Reprendre, Fermer, spec identité §5.6) : avec R3, qui refait `AgentRow`.

## Constats du plan E1 (navigation au clavier, relecture finale)

- Un menu déroulant ouvert (Radix, modal par défaut) n'est pas traité comme un dialogue : Ctrl+Tab déplace la vue et fait clignoter le terminal, mais le menu reprend le clavier. Fermer les menus ouverts avant d'exécuter la commande.
- Maj+Échap est consommé avant les écouteurs d'Échap du mode pose et du mode liaison (`PlacementGhost`, `LinkMode`) : il ne les quitte plus (Échap seul, oui). `canvas.release` pourrait aussi vider `placing` et `linking`. Dans un champ de renommage, Maj+Échap valide (perte du focus) au lieu d'annuler.
- La vue d'ensemble (et « Ajuster la vue ») ignore les barres de verre : passer `canvasOffsets: { top: TOP_ROW_HEIGHT, bottom: BOTTOM_BAR_HEIGHT }` à `scrollToContent`.
- Ctrl+Tab maintenu : une répétition arrivée avant l'image suivante repart de l'ancien terminal et vise deux fois le même (progression ralentie, jamais fausse). Retenir la cible en attente dans `arrive`.
- J8 : l'arrivée différée sur un autre workspace ne partira pas d'une touche ; le focus « à l'image suivante » peut y précéder le montage du terminal. Rendre le focus robuste (réessayer, ou focus au montage du terminal attendu).
- À vérifier à la main : WebView2 transmet-il Ctrl+Tab et Ctrl+Maj+Tab à la page (risque §12.1 de la spec fenêtre).
