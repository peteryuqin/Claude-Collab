# Changelog

All notable changes to Claude-Collab will be documented in this file.

## [3.4.2] - 2025-07-08

### 🐛 Bug Fixes

#### Version Management
- Fixed hardcoded version number in server.ts (was showing 3.2.0 instead of actual version)
- Server now dynamically reads version from package.json

#### WebSocket Issues
- Fixed 'ws is not defined' error in CLI interactive mode
- Changed from undefined `ws` to `connectionHelper.ws`

#### Connection Stability
- Added heartbeat mechanism with ping/pong to maintain stable connections
- Heartbeat sends ping every 30 seconds, expects pong within 35 seconds
- Server now responds to ping messages with pong

#### Multi-Agent Collaboration
- **Fixed message loop issue** - agents were responding to their own messages infinitely
- Changed message type from 'broadcast' to 'chat' to match server implementation
- Added robust self-identification using server-assigned agent IDs
- Agents now properly track their own ID to prevent self-responses

### ✨ Improvements

#### Agent Intelligence
- Added role-specific response generators for meaningful conversations
- Agents now provide actual technical insights based on their roles:
  - Analyst: Technical feasibility and metrics
  - Strategist: Phased implementation approaches
  - Implementer: Technology stack recommendations
  - Validator: Scalability and compatibility concerns
  - Optimizer: Performance and optimization strategies

#### Response Logic
- Implemented perspective-based responses for different topics (API, security, etc.)
- Added 50% response probability to maintain diversity
- Random 2-5 second delays for more natural conversation flow

### 🔧 Technical Details
- Updated swarm-manager.js agent script generation
- Improved message structure handling with proper field checks
- Better error prevention with multiple ID validation methods

## [3.4.1] - 2025-07-08

### 🐛 Critical Bug Fixes

#### Connection Stability
- Fixed undefined `ConnectionManager` error in CLI connection helper
- Rewrote connection helper to use WebSocket directly with proper reconnection
- Added exponential backoff for reconnection attempts
- Improved error messages for connection failures

#### Identity Manager Robustness
- Added JSON validation and automatic recovery for corrupted identities.json
- Implemented backup/restore mechanism for identity persistence
- Added safe parsing with field validation
- Atomic file writes to prevent corruption

#### Swarm Manager
- Fixed string escaping in generated agent scripts
- Properly handles objectives with quotes and special characters
- Uses JSON.stringify for safe string interpolation

#### Examples
- Updated all examples to use correct WebSocket message formats
- Fixed registration flow to match server expectations
- Added proper authentication after registration

### 🛠️ Technical Improvements
- Clean build process with proper TypeScript compilation
- Added comprehensive test suite for all fixes
- Better error handling throughout the codebase

## [3.4.0] - 2025-07-07

### 🎯 Practical Mode - Making Claude-Collab Actually Useful

#### Major Improvements
- **Practical Mode**: Set `PRACTICAL_MODE=true` to allow messages through with warnings instead of blocking
- **Reduced Diversity Threshold**: Lowered from 60% to 30% for more natural conversations
- **Fixed Intervention Messages**: No more "undefined" - clear reasons for diversity requirements
- **Warning Cooldown**: Added 30-second cooldown to prevent spam of diversity warnings
- **Better Session Names**: Fixed undefined session names in logs

#### New Features
- Added practical code review demo showing multi-perspective analysis
- Diversity warnings now provide actionable suggestions
- Messages flow through in practical mode while still encouraging diversity

#### Bug Fixes
- Fixed undefined values in diversity intervention messages
- Fixed async file operations in identity manager  
- Added authentication check for dashboard subscriptions
- Fixed package name from 'harmonycode' to 'claude-collab'
- Fixed session.name undefined errors

#### Documentation
- Added PRACTICAL-IMPROVEMENTS.md explaining all changes
- Added README-PRACTICAL.md with use cases and examples
- Created examples/ directory with working demos
- Updated main README with practical mode instructions

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