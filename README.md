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

This web app is called "infinite timeline" and is educational software for those learning "deep history."

The main canvas features a horizontal timeline which travels from the Big Bang to the present day.  It can be panned and zoomed to focus on any given time period.  It uses OpenAI-compatible endpoints (DO NOT HARDCODE OPENAI MODEL NAMES - instead, the base URL, model names and api keys will be provided by the user in the .env file) to allow the user to talk to a chatbot to ask about history topics.

We should use LangChain JS to build out agent and provide it with a tool to create timeline "events" and "periods" - for example "D Day invasion" or "World War II."

Our timeline should be "rich" and allow for web links, images, and markdown text.  Events and time periods should be hidden/shown based upon the density and zoom level in order to create a very fluid and power experience where, over time, many hundreds of events and be populated as the student learns.

We don't care about logins, user accounts and will store everything in the browser's IndexedDB.

The top of the canvas should include a "Learn Bar" akin to a search bar which will launch a second agent that will engage with the student user and is able to zoom, pan and highlight sections of the timeline as tool calls in the course of a back and forth dialogue.