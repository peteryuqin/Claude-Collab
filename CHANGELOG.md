# Changelog

All notable changes to HarmonyCode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-06-26

### Added
- **Persistent Identity System** - Agents now maintain their identity across sessions
  - Unique agent IDs that never change
  - Secure authentication tokens for reconnection
  - Complete role history tracking
  - Session continuity with accurate metrics
  - New commands: `register`, `whoami`, `switch-role`, `history`
  
- **Atomic Task Locking** - Prevents race conditions when claiming tasks
  - 5-second exclusive locks
  - Automatic lock expiration
  - Task claim protection
  - Prevents duplicate work

- **Command Aliases** - Improved CLI user experience
  - Short alias `hc` for all commands
  - Command suggestions for typos
  - Enhanced help system with quick start guide
  - Configurable aliases in `cli/aliases.json`

- **Enhanced WebSocket Authentication**
  - Authentication flow on connection
  - Token-based agent verification
  - Automatic identity restoration

- **Real-Time File Watching** - Live updates and notifications
  - Automatic file change detection
  - WebSocket notifications for updates
  - Concurrent editing warnings
  - Task board and discussion board monitoring

- **Comprehensive Test Suite**
  - Identity manager tests with 100% coverage
  - Session manager tests
  - Task lock manager tests
  - All tests passing

### Changed
- Server now uses `EnhancedSessionManager` with identity support
- CLI shows identity information in prompts
- Discussion board entries now include agent ID
- Task assignment uses atomic locking
- Added `RealtimeEnhancer` for live updates
- Updated README with v3.1.0 features
- Version bumped to 3.1.0

### Fixed
- **Identity Crisis** - Agents no longer lose identity when changing roles
- **Race Conditions** - Multiple agents can no longer claim the same task
- **Session Persistence** - Agents can reconnect and continue where they left off
- **Metrics Accuracy** - Contributions now correctly attributed to persistent agents
- **Communication Delays** - Real-time updates eliminate manual interventions

### Migration Guide
See `docs/IDENTITY_MIGRATION_GUIDE.md` for detailed migration instructions from v3.0.0.

## [3.0.0] - 2025-01-20

### Added
- Initial release combining HarmonyCode, Claude-Flow, and Anti-Echo-Chamber
- Real-time WebSocket collaboration
- Anti-echo-chamber diversity enforcement
- SPARC development modes (17 specialized roles)
- Swarm orchestration patterns
- Task management system
- Memory persistence
- Perspective tracking and rotation
- Disagreement quotas (30% minimum)
- Evidence requirements
- Diversity-weighted voting

### Known Issues (Fixed in 3.1.0)
- Agents lose identity when changing roles
- Race conditions in task claiming
- No persistent identity across sessions

---

## Version History

- **v3.1.0** (2025-06-26) - Identity Crisis Solved!
- **v3.0.0** (2025-01-20) - Initial unified platform
- **v2.x** - Claude-Flow integration
- **v1.x** - Original HarmonyCode collaboration