# Kay CLI - Complete Implementation Guide

This document explains everything that has been built in the Kay CLI from the beginning to the current state.

---

## Table of Contents

1. [What is Kay CLI?](#what-is-kay-cli)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Modules System](#modules-system)
5. [Authentication](#authentication)
6. [Ask Command (AI Assistant)](#ask-command-ai-assistant)
7. [Health Check](#health-check)
8. [User Interface](#user-interface)
9. [Markdown Rendering](#markdown-rendering)
10. [Configuration Management](#configuration-management)
11. [Backend Integration](#backend-integration)

---

## What is Kay CLI?

**Kay CLI** is a command-line interface tool that helps developers work with Jira and Atlassian tools. It was built by KYG Trade and acts as a frontend that connects to a backend server running on `localhost:4000`.

**Key Features:**
- Login to Jira using OAuth
- Ask questions to an AI assistant about Jira issues
- Check system health
- Interactive chat mode

---

## Project Structure

The project is organized like this:

```
kay-cli/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── core/                    # Core functionality
│   │   ├── commandRegistry.ts   # Command registration system
│   │   ├── moduleLoader.ts      # Dynamic module loading
│   │   ├── configManager.ts     # Configuration file management
│   │   ├── logger.ts            # Logging utilities
│   │   └── markdown.ts          # Markdown rendering
│   └── modules/                 # Feature modules
│       ├── auth/                # Authentication module
│       ├── ask/                 # AI assistant module
│       └── system/              # System utilities module
└── build/                       # Compiled JavaScript (generated)
```

---

## Core Components

### 1. Command Registry (`commandRegistry.ts`)

**What it does:** This is a custom system that replaces the `commander` library. It keeps track of all available commands.

**How it works:**
- Commands are registered with a name, description, and action function
- When you type `kay login`, it finds the "login" command and runs it
- Supports command options like `--json` or `--interactive`
- Parses command-line arguments automatically

**Example:**
```typescript
registry.register({
  name: "login",
  description: "Login to Jira",
  options: [{ name: "json", type: "boolean" }],
  action: loginCommand
});
```

### 2. Module Loader (`moduleLoader.ts`)

**What it does:** Automatically discovers and loads modules from the `src/modules/` folder.

**How it works:**
- Scans the `modules/` directory
- Each module must have an `index.ts` file
- The module exports a `KayModule` object with a `register` function
- Commands are registered when the module loads

**Why this is useful:** New features can be added just by creating a new folder in `modules/`, without touching the main code.

### 3. Configuration Manager (`configManager.ts`)

**What it does:** Manages user configuration stored in `~/.kay/config.json`.

**How it works:**
- Creates the config file if it doesn't exist
- Stores authentication tokens securely
- Provides simple get/set/delete operations
- Files are saved with permissions `600` (only owner can read/write)

**What gets stored:**
- Jira session token (short-lived, 30 minutes)
- Refresh token (long-lived, 7-30 days)
- Account ID

### 4. Logger (`logger.ts`)

**What it does:** Provides colored console output for different types of messages.

**How it works:**
- `Logger.info()` - Blue messages (ℹ️)
- `Logger.success()` - Green messages (✅)
- `Logger.warn()` - Yellow messages (⚠️)
- `Logger.error()` - Red messages (❌)

---

## Modules System

Each module follows a simple pattern:

```
modules/
└── auth/
    ├── index.ts              # Registers commands
    ├── types.ts              # TypeScript interfaces
    ├── jiraClient.ts         # API communication
    └── commands/
        ├── index.ts          # Exports all commands
        ├── login.ts          # Login command
        ├── whoami.ts         # Whoami command
        └── logout.ts         # Logout command
```

**Module Structure:**
1. `index.ts` - Registers the module's commands with the registry
2. `types.ts` - Defines TypeScript types for API responses
3. Command files - Each command is in its own file
4. Shared utilities - Like `jiraClient.ts` for API calls

---

## Authentication

### Login Flow

**Step 1: Initiate Login**
- User runs `kay login`
- CLI calls `GET /auth/login` on the backend
- Backend returns an authorization URL and a state token

**Step 2: Browser Authorization**
- CLI opens the authorization URL in the user's browser
- User logs in with Atlassian/Jira credentials
- User approves access for the CLI

**Step 3: Poll for Completion**
- CLI polls `GET /auth/status/:state` every 2 seconds
- Backend returns "pending" until user completes login
- Once done, backend returns session token and refresh token

**Step 4: Store Credentials**
- CLI saves both tokens to `~/.kay/config.json`
- User is now authenticated

### Token Management

**Session Token:**
- Short-lived (expires in 30 minutes)
- Used for all API requests
- Automatically refreshed when expired

**Refresh Token:**
- Long-lived (expires in 7-30 days)
- Used to get new session tokens
- Rotated on each refresh (old one becomes invalid)

**Automatic Token Refresh:**
- When API returns 401 (unauthorized), CLI automatically refreshes the token
- New tokens are saved automatically
- User never sees authentication errors unless refresh fails

### Commands

**`kay login`**
- Initiates OAuth flow
- Opens browser for authentication
- Waits for user to complete login
- Shows success message with user info

**`kay whoami`**
- Shows currently logged-in user
- Displays name, email, account type, and accessible Jira sites
- Requires authentication

**`kay logout`**
- Calls backend to revoke tokens
- Clears local credentials
- Can logout even if session expired

---

## Ask Command (AI Assistant)

### What It Does

The `ask` command lets you chat with an AI assistant that can help with Jira tasks, answer questions, and perform actions.

### Three Modes

**1. One-Shot Mode:**
```bash
kay ask "Show all my issues"
```
- Single question/answer
- Displays response and exits

**2. Interactive Mode:**
```bash
kay ask --interactive "Help me with Jira"
```
- Multi-turn conversation
- Maintains conversation history
- Continue chatting until you type "exit" or "quit"

**3. Confirmation Mode:**
```bash
kay ask "Delete all tickets" --confirm
```
- For actions that need approval
- Shows what will happen
- Prompts user to confirm before executing

### How It Works

**Session Management:**
- Each interactive conversation gets a `session_id`
- Backend stores conversation history server-side
- CLI sends `session_id` with each message to continue the conversation

**Request Flow:**
1. User types a question
2. CLI sends to `POST /ask` with prompt, interactive flag, and session_id
3. Backend processes with AI and returns response
4. If confirmation needed, CLI shows prompt and calls `/ask/confirm`
5. Response is displayed with markdown rendering

**Response Handling:**
- If backend returns `requires_confirmation: true`, user is prompted
- Confirmation token is sent to `/ask/confirm` endpoint
- User can approve or cancel the action

---

## Health Check

The `kay health` command checks if the backend services are working.

### What It Shows

**Overall Status:**
- `healthy` - Everything working
- `degraded` - Some issues
- `unhealthy` - Major problems

**Service Status:**
- **Database** - Can the backend connect to its database?
- **OpenAI** - Is the AI service configured and working?
- **MCP Jira** - Is the Jira integration enabled and connected?

### Output

**Visual Indicators:**
- ● Green = Healthy
- ● Yellow = Degraded
- ● Red = Unhealthy
- ○ Gray = Disabled

**Details:**
- Shows connection status
- Displays error messages if any
- Shows number of available tools (for MCP Jira)

---

## User Interface

### CLI Framework: Clack

We use `@clack/prompts` instead of basic `console.log` for a better user experience.

**Features:**
- Spinners for loading states
- Colorized output
- Interactive prompts (text input, confirmations)
- Progress indicators

**Example:**
```typescript
const s = p.spinner();
s.start("Loading...");
// Do work
s.stop("Done!");
```

### Interactive Chat Interface

**Layout:**
```
┌─────────────────────────────────────┐
│     Interactive Chat Mode            │
│                                      │
│  You: Hello                          │
│                                      │
│  Kay: Hi! How can I help?            │
│                                      │
└─────────────────────────────────────┘
```

**Features:**
- Full-width conversation box
- Color-coded messages (green for user, cyan for Kay)
- Real-time markdown rendering
- Clean, scrollable interface

### Boxed Output

We use the `boxen` library to create beautiful bordered boxes for:
- Conversation history
- Kay's responses
- Welcome messages

---

## Markdown Rendering

### The Problem

AI responses come back as markdown (with `**bold**`, `*italic*`, links, lists, etc.). We need to convert this to terminal-friendly formatted text.

### The Solution

**Libraries Used:**
- `marked` - Parses markdown
- `marked-terminal` - Converts markdown to terminal-formatted output
- `chalk` - Adds colors to text
- `strip-ansi` - Cleans up any escape codes

### How It Works

1. **Input:** Raw markdown string from backend
2. **Clean:** Remove ANSI codes, normalize line endings
3. **Parse:** Convert markdown to tokens (bold, links, lists, etc.)
4. **Render:** Convert tokens to terminal-formatted text with colors
5. **Output:** Clean, formatted text ready to display

### Custom Styling

**Bold Text (`**text**`):**
- Rendered as bold using `chalk.bold()`

**Links (`[text](url)`):**
- Text shown in blue/cyan
- URL shown in parentheses (or clickable if terminal supports it)

**Code Blocks:**
- Yellow syntax highlighting
- Language label shown in gray

**Headings:**
- H1: Blue, bold, underlined
- H2: Cyan, bold
- H3: White, bold

**Lists:**
- Bullets formatted consistently
- Proper indentation
- Compact spacing

---

## Configuration Management

### Config File Location

`~/.kay/config.json`

### File Structure

```json
{
  "jira": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "accountId": "557058:abc123-def456-ghi789"
  }
}
```

### Security

- File permissions: `600` (only owner can read/write)
- Never committed to git (in `.gitignore`)
- Tokens are sensitive and stored securely

### Operations

**Get Config:**
```typescript
const token = ConfigManager.get("jira.token");
```

**Set Config:**
```typescript
ConfigManager.set("jira", { token, refreshToken, accountId });
```

**Delete Config:**
```typescript
ConfigManager.delete("jira");
```

---

## Backend Integration

### Architecture

**CLI = Frontend, Backend = Server**

The CLI doesn't talk directly to Atlassian/Jira. Instead:
- CLI talks to backend at `http://localhost:4000`
- Backend handles all OAuth, Jira API calls, AI processing
- CLI just displays results and handles user input

### API Endpoints

**Authentication:**
- `GET /auth/login` - Start login flow
- `GET /auth/status/:state` - Check login status
- `POST /auth/refresh` - Refresh session token
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout and revoke tokens

**AI Assistant:**
- `POST /ask` - Send message to AI
- `POST /ask/confirm` - Confirm a pending action

**System:**
- `GET /health` - Check backend health

### Request Format

**Authenticated Requests:**
```
GET /auth/me
Authorization: Bearer {session_token}
```

**Request Body (for POST):**
```json
{
  "prompt": "Show my issues",
  "interactive": true,
  "session_id": "session_123..."
}
```

### Error Handling

**401 Unauthorized:**
- Token expired
- CLI automatically refreshes token
- Retries the request

**Connection Errors:**
- Shows friendly error message
- Suggests checking if backend is running

**API Errors:**
- Displays error message from backend
- Helps user understand what went wrong

---

## Technical Details

### TypeScript

- All code is written in TypeScript
- Strict type checking enabled
- No `any` types (except for marked-terminal compatibility)
- Interfaces defined for all API responses

### Build Process

1. Write TypeScript in `src/`
2. Run `npm run build` to compile
3. JavaScript output goes to `build/`
4. Main entry: `build/index.js`
5. Global command: `npm link` creates `kay` command

### Dependencies

**Core:**
- `@clack/prompts` - CLI UI framework
- `picocolors` - Lightweight colors
- `boxen` - Bordered boxes
- `marked` + `marked-terminal` - Markdown rendering
- `chalk` - Terminal colors
- `strip-ansi` - Clean ANSI codes

**Utilities:**
- `open` - Open URLs in browser
- `dotenv` - Environment variables (if needed)
- `figlet` - ASCII art (for banners)

---

## File Permissions & Security

### Config File Security

```bash
chmod 600 ~/.kay/config.json
```

This ensures:
- Only the file owner can read/write
- Other users can't access your tokens
- Prevents accidental exposure

### Token Storage

- Tokens stored in plain text (but file is protected)
- Could be encrypted in the future
- Never logged or displayed in full
- Automatically cleared on logout

---

## Common Patterns

### Command Structure

```typescript
export async function myCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  // 1. Validate authentication
  const client = new JiraClient();
  if (!client.isAuthenticated()) {
    Logger.error("Not authenticated. Run 'kay login' first.");
    process.exit(1);
  }

  // 2. Show loading spinner
  const s = p.spinner();
  s.start("Doing something...");

  // 3. Make API call
  try {
    const data = await client.makeAuthenticatedRequest(url);
    s.stop();

    // 4. Display results
    Logger.success("Done!");
  } catch (error) {
    s.stop();
    Logger.error(error.message);
    process.exit(1);
  }
}
```

### Module Registration

```typescript
export const KayModule = {
  register: (registry: CommandRegistry) => {
    registry.register({
      name: "mycommand",
      description: "Does something",
      options: [
        { name: "json", description: "JSON output", type: "boolean" }
      ],
      action: myCommand
    });
  }
};
```

---

## Future Improvements

Potential enhancements:
- Encrypt tokens in config file
- Support for multiple backends
- Plugin system for custom commands
- Better error recovery
- Command aliases
- Command history
- Auto-completion

---

## Summary

Kay CLI is a complete CLI application that:
1. ✅ Authenticates users with Jira via OAuth
2. ✅ Manages tokens securely
3. ✅ Provides an interactive AI assistant
4. ✅ Renders markdown beautifully
5. ✅ Has a clean, modern UI
6. ✅ Handles errors gracefully
7. ✅ Is modular and extensible

Everything is built from scratch using modern TypeScript, following best practices for security, user experience, and code organization.

