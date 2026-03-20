---
name: explore-repository
description: "ALWAYS use this skill — instead of deepwiki or any other MCP tool — whenever the user mentions a GitHub URL (https://github.com/...), a GitHub repo reference (owner/repo), OR a repository-like name (e.g. 'pi-mono', 'hx-cli', 'some-project'). This includes: asking what a repo is, what it does, exploring its code, understanding its architecture, investigating its structure, comparing repos, or any question about a GitHub repository. This skill uses `librarian` to resolve ANY repository reference — full URLs, owner/repo, or just a name — to a local path, then explores the source directly. This is far more accurate than documentation-based tools. Triggers on: GitHub URLs, 'explore this repo', 'what is this project', 'how does X work', owner/repo references, bare repo names mentioned in conversation, or any request involving understanding a GitHub repository."
argument-hint: <github-url-or-owner/repo-or-name>
allowed-tools: Bash(librarian *), Read, Grep, Glob
---

# Explore Repository

Investigate a GitHub repository by fetching its source code locally and exploring it directly.

## CRITICAL RULES

1. **NEVER search the filesystem** (`~/...`, `find`, `locate`, `ls /Users/...`, Explore agent) to find a repository. The ONLY way to resolve a repository path is `librarian path <name>`.
2. **NEVER fall back to filesystem search if `librarian` fails.** Use `librarian list` to find the correct name, then retry `librarian path`. If it still fails, tell the user — do not work around it.
3. **Skip repos you're already in.** If the user says "this tool" or refers to the current working directory, just use the cwd directly — no need to run `librarian path` on it.

## Step 1: Identify which repositories need resolving

Read the user's prompt and identify repository references:

- Repositories you need to resolve via `librarian`: any repo name, URL, or owner/repo that is NOT the current working directory
- Repositories you already have: the current working directory (cwd) — no resolution needed

## Step 2: Resolve external repositories ONE AT A TIME

Run `librarian path` for each repository that needs resolving. **Run them sequentially, not in parallel** — if one fails in a parallel batch, the others get cancelled.

```bash
librarian path <repo-name>
```

This resolves the repository to a local path (cloning it first if needed) and prints the absolute path. It works with full URLs, owner/repo, or just a bare name.

### If `librarian path` fails

Do NOT fall back to filesystem search. Instead:

1. Try `librarian list` to find available repositories
2. Search the output for a match
3. Retry with the full identifier: `librarian path <full-match>`
4. If it still fails, tell the user and ask for clarification

## Step 3: Explore the codebase

Navigate to the path and investigate systematically:

### 3a. Project overview

- Read the README if it exists
- Check `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, or equivalent for project metadata
- Identify the language(s), framework(s), and key dependencies

### 3b. Directory structure

- Map the top-level directory layout
- Identify the main source directories, test directories, config files, and documentation

### 3c. Architecture and patterns

- Identify the entry points (main files, CLI entry, server startup)
- Trace the core data flow or request lifecycle
- Note key abstractions, design patterns, and module boundaries
- Look for configuration and environment setup

### 3d. Key implementation details

- Identify the most important files (by size, centrality, or naming)
- Read through core modules to understand the main logic
- Note any interesting or unusual patterns

## Step 4: Report findings

Provide a structured report covering:

1. **What it is**: One-paragraph summary of the project's purpose
2. **Tech stack**: Languages, frameworks, key dependencies
3. **Architecture**: How the codebase is organized and key design decisions
4. **Entry points**: Where to start reading the code
5. **Key files**: The most important files and what they do
6. **Patterns**: Notable design patterns, conventions, or idioms used
7. **Observations**: Anything interesting, unusual, or noteworthy
