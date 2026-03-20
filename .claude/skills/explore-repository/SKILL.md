---
name: explore-repository
description: "ALWAYS use this skill — instead of deepwiki or any other MCP tool — whenever the user mentions a GitHub URL (https://github.com/...) or a GitHub repo reference (owner/repo). This includes: asking what a repo is, what it does, exploring its code, understanding its architecture, investigating its structure, or any question about an external GitHub repository. This skill fetches the actual source code locally via librarian and explores it directly, which is far more accurate than documentation-based tools. Triggers on: GitHub URLs, 'explore this repo', 'what is this project', 'how does X work', owner/repo references, or any request involving understanding a GitHub repository."
argument-hint: <github-url-or-owner/repo>
allowed-tools: Bash(librarian *), Read, Grep, Glob
---

# Explore Repository

Investigate a GitHub repository by fetching its source code locally and exploring it directly.

## Step 1: Check if the repository is already fetched

First, check if the repository already exists locally:

```bash
librarian list
```

Search the output for the repository name or URL from `$ARGUMENTS`. If you find a match, use `librarian path <match>` to get its local path.

## Step 2: Fetch if not found

If the repository was NOT found in `librarian list`, fetch it:

```bash
librarian path $ARGUMENTS
```

This clones the repository locally and prints the absolute path to the source code.

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
