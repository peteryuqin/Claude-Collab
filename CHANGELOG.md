# Changelog

All notable changes to Claude-Collab will be documented in this file.

## [3.2.3] - 2025-06-28

### Fixed
- Fixed `cc server` command exiting immediately by properly awaiting async server start
- Added proper process keep-alive mechanism to prevent CLI from exiting
- Server now stays running correctly when started via CLI

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2025-06-27

### Added
- **🔒 Unique Name Enforcement** - Prevents duplicate agent names with intelligent suggestions
  - Server-side name availability checking during registration
  - Smart name suggestions when conflicts occur (e.g., agent2, agent_new)
  - Force registration option for edge cases
  - Efficient name-to-agent mapping for fast lookups

- **🧹 Session Cleanup** - Automatic removal of ghost sessions 
  - Detects and cleans inactive sessions after 5 minutes
  - Activity-based session timeouts prevent zombie connections
  - Hourly session activity reporting
  - Manual cleanup triggers for maintenance

- **⚡ Enhanced Real-time Updates** - Message queue system eliminates manual checking
  - Priority-based message processing (high/medium/low)
  - Batch processing prevents notification flooding  
  - Auto-queuing for different file types (messages get high priority)
  - Eliminates need for manual "check messages" prompts

- **📋 Version Compatibility Warnings** - Smart version mismatch detection
  - Client sends version info on connection
  - Server performs semantic version compatibility checking
  - Color-coded warnings (yellow for minor, red for major mismatches)
  - Specific upgrade commands provided (npm install -g claude-collab@latest)

- **🎯 Rich Identity Cards** - Enhanced whoami command with gamification
  - Agent ranking system (Newcomer → Master Collaborator)
  - Achievement badges (🏆 Veteran, 🌈 Diversity Champion, 📊 Evidence Expert)
  - Personalized recommendations based on contribution patterns
  - Session statistics and contribution tracking
  - Role/perspective evolution history

### Fixed
- **Ghost Sessions** - Eliminated persistent zombie sessions from previous versions
- **Duplicate Names** - Resolved identity confusion where multiple agents had same name but different IDs
- **Manual Checking** - Real-time updates now happen automatically without user intervention
- **Version Confusion** - CLI and server versions now perfectly synchronized

### Changed
- `registerAgent` method now always creates new agents (duplicate prevention moved to server level)
- Enhanced `whoami` response includes comprehensive identity card with rankings and badges
- Real-time notifications use priority queuing for better performance
- Server validates client versions and provides upgrade guidance
- Version headers updated throughout codebase to v3.2.0

### Technical
- Added comprehensive v3.2 feature test suite (58 tests total, 56 passing)
- Improved async/await patterns in timeout tests
- Enhanced TypeScript type safety with new interfaces
- Better error handling in file operations
- Performance optimizations in identity lookups
- Fixed test directory creation and cleanup issues

### Performance
- Name lookups now O(1) instead of O(n) with Map-based indexing
- Session cleanup runs efficiently every minute
- Message queue processes up to 5 items per batch to prevent overwhelming
- Efficient cleanup of stale cursor positions and editor tracking

## [3.1.1] - 2025-06-27

### Fixed
- **Version Display Bug** - CLI now correctly shows version from package.json instead of hardcoded "3.0.0"
- **Dynamic Version** - All version references in CLI output now use package.json version dynamically

### Technical
- CLI reads version from package.json at runtime
- No more hardcoded version strings in CLI output
- Fixes the issue where `claude-collab --version` showed "3.0.0" even with v3.1.0 installed

## [3.1.0] - 2025-01-26

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
  - Short alias `cc` for all commands
  - Command suggestions for typos
  - Enhanced help system with quick start guide
  - Configurable aliases in `cli/aliases.json`

- **Enhanced WebSocket Authentication**
  - Authentication flow on connection
  - Token-based agent verification
  - Automatic identity restoration

### Changed
- Server now uses `EnhancedSessionManager` with identity support
- CLI shows identity information in prompts
- Discussion board entries now include agent ID
- Task assignment uses atomic locking
- Version bumped to 3.1.0

### Fixed
- **Identity Crisis** - Agents no longer lose identity when changing roles
- **Race Conditions** - Multiple agents can no longer claim the same task
- **Session Persistence** - Agents can reconnect and continue where they left off
- **Metrics Accuracy** - Contributions now correctly attributed to persistent agents

### Migration Guide
See `docs/IDENTITY_MIGRATION_GUIDE.md` for detailed migration instructions from v3.0.0.

## [3.0.0] - 2025-01-20

### Added
- Initial release combining Claude-Collab, Claude-Flow, and Anti-Echo-Chamber
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

- **v3.2.0** (2025-06-27) - Ghost Busters Edition! 👻✨
- **v3.1.1** (2025-06-27) - Version Display Fix
- **v3.1.0** (2025-01-26) - Identity Crisis Solved!
- **v3.0.0** (2025-01-20) - Initial unified platform
- **v2.x** - Claude-Flow integration
- **v1.x** - Original Claude-Collab collaboration