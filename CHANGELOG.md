# Changelog

All notable changes to Claude-Collab will be documented in this file.

## [3.3.0] - 2024-06-29

### 🎉 Major Features

#### Multi-Agent Swarm System
- Added `cc swarm <objective>` command to spawn multiple AI agents
- Configurable strategies: distributed, research, development, review
- Auto-starts server if not running
- Added `cc swarm-stop` to halt all swarm agents

#### Persistent Memory System  
- Added `cc memory` command with SQLite backend
- Commands: store, get, list, delete, clear, stats, export, import
- TTL support for expiring keys
- Tagging system for organization
- Import/export to JSON

#### Real-Time Dashboards
- Added `cc watch` for terminal-based monitoring dashboard
- Shows active agents, live messages, diversity metrics
- Keyboard shortcuts: q=quit, r=refresh, f=filter, tab=navigate
- Added complete web dashboard in `ui/` directory (React/TypeScript)

#### Connection Stability
- Improved error messages (no more stack traces)
- Automatic reconnection with exponential backoff
- Message queuing during disconnects
- Connection health monitoring

### Changed
- Enhanced CLI with better help text
- Improved WebSocket handling throughout
- Better error recovery mechanisms

### Known Issues
- SPARC modes still show placeholder output
- Export/import sessions not yet implemented
- Web UI requires separate npm install in ui/ directory

## [3.2.3] - Previous
- Session cleanup for ghost connections
- Version compatibility warnings
- Enhanced identity system