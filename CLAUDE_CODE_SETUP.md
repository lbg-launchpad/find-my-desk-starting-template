# Getting Started with Claude Code

## Prerequisites

- Homebrew
- An Anthropic API key (provided via the Claude Console)

---

## 1. Install Claude Code

```bash
brew install --cask claude-code
```

---

## 2. Set your API key

Claude Code authenticates via the `ANTHROPIC_API_KEY` environment variable.

**For the current session only:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**To persist it across sessions**, add the export to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.zshrc
source ~/.zshrc
```

---

## 3. Run it

Navigate to your project directory and launch:
```bash
cd your-project
claude
```

Claude Code will pick up `ANTHROPIC_API_KEY` automatically. If the key is missing or invalid, it will tell you on startup.

---

## Notes

- **Never commit your API key** to the repo. Add `.env` to `.gitignore` if you store it there.