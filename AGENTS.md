# Agent guidelines

This repository is for the following hackathon event:

- https://github.com/microsoft/agentsleague-techconnect
- https://github.com/microsoft/agentsleague-techconnect/tree/main/starter-kits/1-creative-apps

## Basic Rules

- All docs, code and comments must be in English

## Event Overview

- **Event**: Agents League @ TechConnect
- **Track**: 🎨 Creative Apps (Battle #1) — Creative app development with GitHub Copilot
- **Format**: 2-hour in-person AI agent hackathon (Microsoft internal)
- **Schedule**: 10 min Welcome → 100 min Build → 10 min Wrap-up
- **Submission Deadline**: February 13, 2026, 11:59 PM (PT)
- **Submission**: Create an Issue using the [Project Submission Template](https://github.com/microsoft/agentsleague-techconnect/issues/new?template=project.yml)

## Core Requirements (Creative Apps Track)

1. **GitHub Copilot Usage (Required)**: Use Copilot suggestions, Chat, and debugging assistance meaningfully during development, and document how it was used
2. **Creative Application (Required)**: Build an app with a unique or novel concept that provides value, entertainment, or utility to users, with thoughtful UX
3. **MCP Integration (Required)**: Integrate a Model Context Protocol (MCP) server to connect with external data sources or enable tool interoperability

## Evaluation Criteria

| Criteria                        | Weight |
| ------------------------------- | ------ |
| Accuracy & Relevance            | 20%    |
| Reasoning & Multi-step Thinking | 20%    |
| Creativity & Originality        | 15%    |
| User Experience & Presentation  | 15%    |
| Reliability & Safety            | 20%    |
| Community Vote (Discord)        | 10%    |

## Security & Confidentiality Constraints

**This repository is PUBLIC. The following rules must be strictly observed:**

### Prohibited ❌

- Do not include API keys, passwords, tokens, or credentials in code
- Do not include customer data or PII (Personally Identifiable Information)
- Do not include Microsoft Confidential information (General level only)
- Do not include proprietary code or trade secrets
- Do not include pre-release product information under NDA

### Best Practices ✅

- Store secrets in environment variables (`.env`) and add them to `.gitignore`
- Use placeholder values in sample configuration files
- Review Git commit history before pushing
- Enable GitHub Secret Protection

## Recommended Tools & Resources

- [GitHub Copilot CLI SDK](https://github.com/github/copilot-sdk) — CLI tool development
- [WorkIQ MCP](https://github.com/microsoft/work-iq-mcp) — Microsoft 365 data integration
- [MCP in VS Code](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) — Connect MCP servers in VS Code
- [Agents League Discord](https://aka.ms/agentsleague/discord) — Community & questions
