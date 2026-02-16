# quick-site-demo

## INSTRUCTIONS FOR HUMANS:

**In order to "vibe code" this web application to life...**

1. Run `node --version` to verify you have Node.js on your dev computer.
1. Fully read and flesh out this README file (take this seriously and be descriptive)
1. Use a prompt like the following to start off your agent:

```txt
Review README.md in order to understand this repo and compile a plan in order to built it, asking questions if needed.
```

**TIPS AND TRICKS:**

1. Use your agent's **PLAN mode** to kick the process off and *anytime* you start from fresh context.

1. Use Claude Opus 4.6 Thinking (or newer models). **By using state-of-the-art models and methods we get state-of-the-art results.**  Vibing can be a terrible and frustrating experience with out-dated technology.

1. Take advantage of your agentic-IDE's design features especially built for things like web design. For example, see https://cursor.com/blog/browser-visual-editor.

## INSTRUCTIONS FOR AGENTS:

This repository is a Svelte 5 web app meant to be built with GitHub Actions, deployed with GitHub Pages, and has the following requirements:

- It should work as an SPA, with hash-based routing.
- It should include a 404.html which will re-route a user back to the homepage.
- It should be entirely client-side (no SSR)

The agent's job is to take lead on the design, implementation, devops, and repository maintenance for this project as it is iteratively build with human developer team feedback. Your development should be tracked in a SINGLE markdown file which remains terse, should have sections rewritten instead of holding appended chronologies, and should be used primarily by the agent and can therefore avoid technical explanations and code snippets meant for human readability.

### How to install and run locally

```
pnpm install
```

Once installed ...

```
pnpm run dev
```

---

## WEB APP DESIGN:

This web app...

NOTE: PLACE IMAGES IN THE `assets/` directory (if needed), then describe them and how they should be used.
