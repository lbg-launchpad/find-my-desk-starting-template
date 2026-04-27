# Hackathon 1 — Starting Template

Welcome to the starting template for Hackathon 1. This repo contains everything you need to get your team up and running.

## Getting Started

**Fork this repository** and rename it to your team name. That will be your team's working repo for the duration of the hackathon.

---

## Helpful Docs

We're building with **Claude Code** — Anthropic's AI coding assistant. If you haven't used it before, start here:

- [Claude Code overview](https://docs.anthropic.com/en/claude-code/overview) — what it is and how it works
- [Quickstart guide](https://docs.anthropic.com/en/claude-code/quickstart) — installation and first steps
- [Claude Code CLI reference](https://docs.anthropic.com/en/claude-code/cli-reference) — all commands and flags
- [Memory & context](https://docs.anthropic.com/en/claude-code/memory) — how Claude retains context across sessions
- [CLAUDE.md files](https://docs.anthropic.com/en/claude-code/memory#claudemd-files) — how to give Claude persistent instructions for your project
- [Hooks](https://docs.anthropic.com/en/claude-code/hooks) — run shell commands automatically on Claude events
- [MCP (Model Context Protocol)](https://docs.anthropic.com/en/claude-code/mcp) — extend Claude with external tools and data sources
- [Claude API reference](https://docs.anthropic.com/en/api/getting-started) — if you're building on top of the API directly

---

## Dummy Data

The `data/` directory contains seed data to build against.

### `data/users.json`

50 fictional employee records for a bank. Each record includes:

| Field | Description |
|---|---|
| `id` | UUID |
| `employeeId` | Integer, e.g. `80124` |
| `fullName` / `email` | Identity fields |
| `location` | `London`, `Edinburgh`, or `Leeds` |
| `team` | One of: Security, Data, Platform Engineering, Mac, Directory Services, Specialist Support |
| `role` | Analyst, Engineer, Senior Engineer, Lead Engineer, Lead, Product Manager |
| `lineManager` | Object with `name` and `email` fields |
| `anchorDays` | Days the employee is expected in the office |
| `defaultWorkingPattern` | Per-day `office` or `remote` schedule |
| `preferredNeighbourhood` | Desk zone preference: Quiet Zone, Collaboration Zone, Core Desk Area, Window Bank |
| `deskPreferences` | Array of preferences e.g. `standing-desk`, `window-seat`, `accessible-desk`, `dual-monitor`, `near-team`, `quiet-area` |
| `bookingWindowDays` | How far ahead they can book a desk |
| `accessibilityNeeds` | String (e.g. `ergonomic-chair`) or `null` |
