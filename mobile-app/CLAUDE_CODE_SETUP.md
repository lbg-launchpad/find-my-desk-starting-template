# Getting Started with Claude Code

## Prerequisites

### macOS
- Homebrew
- An Anthropic API key (provided by Hackathon organisers)

### Windows
- An Anthropic API key (provided by Hackathon organisers)

---

## 1. Install Claude Code

### macOS
```bash
brew install --cask claude-code
```

Alternatively, download the desktop app: https://code.claude.com/docs/en/desktop-quickstart

### Windows
Download and run the installer: https://code.claude.com/docs/en/desktop-quickstart

---

## 2. Set your API key

Claude Code authenticates via the `ANTHROPIC_API_KEY` environment variable.

### macOS

**For the current Terminal session only:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**To persist it across Terminal sessions**, add the export to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.zshrc
source ~/.zshrc
```

### Windows

**PowerShell (current session only):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

**Command Prompt (current session only):**
```cmd
set ANTHROPIC_API_KEY=sk-ant-...
```

**To persist it across sessions**, add it to your PowerShell profile:
```powershell
Add-Content $PROFILE "`n`$env:ANTHROPIC_API_KEY = `"sk-ant-...`""
```

Or set it permanently via **System Properties → Environment Variables**.

---

## 3. Run Claude

Navigate to your project directory and launch:
```bash
cd your-project
claude
```

Claude Code will pick up `ANTHROPIC_API_KEY` automatically. If the key is missing or invalid, it will tell you on startup.

> **Windows users:** Use PowerShell or Windows Terminal for the best experience.

---

## Notes

- **Never commit your API key** to the repo. Add `.env` to `.gitignore` if you store it there.
