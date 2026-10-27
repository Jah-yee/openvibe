# Troubleshooting

[Version française](troubleshooting.fr.md)

Start with the **Troubleshooting** dialog: the settings menu (the gear), the command palette (`Ctrl+K`, then type "troubleshooting"), or the link at the bottom of the home screen. It shows OpenVibe's version, the agents it finds and where, Git, Git Bash and the local server, and gives you the diagnostics to copy into a bug report.

## Windows SmartScreen stops the installer

Betas are not code-signed yet. Choose **More info**, then **Run anyway**. The installer only installs for your user (in `%LOCALAPPDATA%\OpenVibe`) and needs no administrator rights. Updates downloaded by OpenVibe itself are signed, and an update whose signature does not match is refused.

## An agent is not found

OpenVibe launches the agent CLIs installed on your PC; it looks for them on Windows' `PATH`.

1. Check that the agent runs in a new PowerShell window: `claude --version` (or `codex`, `gemini`, …).
2. In OpenVibe, click **Check again** (on the home screen, or in the Troubleshooting dialog). It reads Windows' `PATH` again, so an agent installed while OpenVibe runs is found without restarting it.
3. Still not found: `where.exe claude` in PowerShell shows the folder it is in. That folder must be in your user or system `PATH` (Windows settings → "Edit environment variables for your account").

Claude Code is needed for the orchestrator, missions and the usage meter. Its official installer, in PowerShell: `irm https://claude.ai/install.ps1 | iex` (see [Claude Code's setup page](https://code.claude.com/docs/en/setup)).

## The usage meter stays empty

The meter in the top bar reads Claude Code's usage through a small script run by `bash`. It needs **Git Bash**, which comes with [Git for Windows](https://git-scm.com/download/win). The Troubleshooting dialog says whether Git Bash is found. After installing Git, restart OpenVibe.

## "OpenVibe tools unavailable" on an orchestrator

An orchestrator only starts with OpenVibe's own tools, served by a local server inside OpenVibe; without them it could change your branch, so it does not start. Click **Try again**. If it happens again, the Troubleshooting dialog shows whether the local server runs; restart OpenVibe, and if it goes on, attach the log to a bug report.

## A mission says the repository has no commit

A mission works on git branches, which need a first commit. In the project's folder: `git add -A`, then `git commit -m "First commit"`, and launch the mission again.

## Where the logs and data are

- Logs: `%LOCALAPPDATA%\dev.openvibe.app\logs\openvibe.log`. They never hold a token, a terminal's text or an instruction. **Open the logs folder** in the Troubleshooting dialog or the settings menu.
- Data (projects, canvases, terminals' history): `%APPDATA%\dev.openvibe.app\openvibe.db`. Before upgrading its database, OpenVibe keeps a copy next to it (`openvibe.v<N>-backup.db`). **Open the data folder** in the Troubleshooting dialog.

## Report a bug

In the Troubleshooting dialog, click **Copy the diagnostics**, then **Report a problem**: it opens a new GitHub issue with your version filled in. Paste the diagnostics and, if you can, attach `openvibe.log`. The diagnostics hold no token, no project path, and your home folder shows as `~`.

Security problems: please follow [SECURITY.md](../SECURITY.md) instead of opening a public issue.

## Start from scratch

1. Close OpenVibe.
2. Rename `%APPDATA%\dev.openvibe.app` (for example to `dev.openvibe.app.old`).
3. Start OpenVibe: it creates an empty database. Your project folders are not touched; add them again from the home screen.

To go back, close OpenVibe and give the folder its name again.

## Uninstall

Windows settings → Apps → Installed apps → OpenVibe → Uninstall. Your data stays in `%APPDATA%\dev.openvibe.app` unless you tick the uninstaller's box to delete the application data, or delete the folder yourself; your project folders are never touched.
