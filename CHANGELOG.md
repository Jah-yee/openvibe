# Changelog

All notable changes to OpenVibe are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- The interface in English and French. It follows Windows' language (English unless Windows is in French); the settings menu and the command palette switch it at once.
- A log file (`%LOCALAPPDATA%\dev.openvibe.app\logs\openvibe.log`), opened from the command palette or the settings menu, to attach to a bug report. It never holds a token, a terminal's text or an instruction.
- Before upgrading its database, OpenVibe keeps a copy of it (`openvibe.v<N>-backup.db`).
- An orchestrator that cannot get OpenVibe's tools does not start, and its node says why.
- A strict content security policy for the interface.

### Changed
- An orchestrator may no longer run shell commands, and only gets OpenVibe's own MCP tools.
- Closing a working orchestrator asks for confirmation first.

### Fixed
- Resuming a Claude session that never had a conversation starts a new one instead of dropping back to the shell.
- The periodic save could replace a terminal's final output with an older copy.
- A rendering error no longer blanks the whole window: it stays in its node, panel or dialog, and the window can reload without stopping the agents.
- A crash in one thread no longer closes OpenVibe and every agent with it.
- A database from a newer OpenVibe is no longer opened by an older one.
- The local server's token no longer appears on any command line.
- Terminals of an OpenVibe started from Claude Code no longer inherit that session's variables.
- A mission in a repository without a commit says so instead of showing git's error.
- A merge refused by a git hook no longer blocks the next merges.
- Mission times stop when the mission ends.
- A deleted orchestrator no longer raises budget alerts, and reports sent while it is stopped reach it when it starts again.
