# Security policy

OpenVibe launches AI coding agents in real terminals on your machine, so its security matters to everyone who uses it. Thank you for helping keep it safe.

## Supported versions

OpenVibe is an early preview. Only the latest code on the `main` branch receives security fixes.

| Version | Supported |
|---|---|
| `main` (0.1.x) | Yes |
| Anything older | No |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub instead: open the repository's **Security** tab and choose **Report a vulnerability**. GitHub's guide is [Privately reporting a security vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

Please include:

- the version or commit you tested;
- what an attacker can do, and what they need first (a local account, a malicious repository, a crafted agent output…);
- the steps to reproduce, ideally with a minimal example.

OpenVibe is maintained by one person in their spare time, so these are goals rather than guarantees:

- an acknowledgement within 7 days;
- an assessment within 14 days;
- a fix or a mitigation as soon as possible for serious issues.

We will credit you in the advisory unless you prefer to stay anonymous.

## Security model

OpenVibe is a local desktop app. It is designed around these rules:

- **Your agents keep their own guardrails.** OpenVibe never adds permission-bypass flags such as `--dangerously-skip-permissions`. Your agents run with your user account and ask for permission the way you configured them. The only prompt OpenVibe ever answers for you is Claude Code's folder-trust question, and only in the mission worktrees it created itself.
- **The local server only accepts requests from your machine.**
  - The server that receives agent hooks, status lines and MCP calls listens on `127.0.0.1` only, on a port the OS picks at random.
  - Hook and status routes need a token drawn each time the app starts.
  - The MCP route needs a separate bearer token for each session, revoked when that session ends.
  - Request bodies are capped (64 KiB for hooks, 256 KiB for MCP), and node ids are checked against a strict pattern.
- **Your Claude settings are only read.** OpenVibe reads your `~/.claude/settings.json` and the project's `.claude/settings*.json` to keep your own status line. It never writes to them.
  - Its own per-session files (the `--settings` file, the MCP configuration and the role prompt) are written to its app data folder, deleted when the session ends, and cleared at startup.
- **Git stays local.** Missions create branches and worktrees next to your repository. OpenVibe never pushes, and never merges into your own branch.
- **No telemetry.** The app itself makes no network requests. Fonts and icon libraries are bundled. Links you click, such as a Remote Control link, open in your browser.
- **Inputs to launch commands are checked.** Session ids must be UUIDs, model and Ollama names must match a strict pattern, and terminal titles are stripped of quotes and control characters. A *Custom* agent's command is typed exactly as you wrote it: that is its purpose.

## Known limitations

These are known and tracked. Reports that show a practical way to exploit them are still welcome.

- **Terminal history is stored unencrypted.** Each terminal keeps up to 512 KiB of its output in the local SQLite database (`%APPDATA%\dev.openvibe.app\openvibe.db`). Anything an agent printed, secrets included, can end up there.
- **Tokens are visible to your own account.** The hook token appears on the command lines of the `curl` and `bash` processes that report status, and Codex receives it in its `notify` setting. Another program running under your account could read it and send fake states or usage to OpenVibe.
- **The webview has no Content Security Policy** (`"csp": null` in `src-tauri/tauri.conf.json`). The interface only loads bundled assets, but a policy would add defense in depth.
- **Agents run with your permissions.** OpenVibe does not sandbox them. Review what you let an agent do, especially in auto-accept modes, and prefer missions, which isolate each agent in its own worktree.

## Out of scope

- Vulnerabilities in the agent CLIs themselves (Claude Code, Codex, Gemini CLI…). Please report those to their vendors.
- Attacks that require an administrator account or malware already running as your user, except where OpenVibe makes them meaningfully easier.
- Problems that only exist in a modified build of OpenVibe.
