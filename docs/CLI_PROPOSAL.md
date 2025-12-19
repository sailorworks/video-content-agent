# CLI Implementation Proposal: Charm-Powered Terminal Interface

## Summary

This proposal suggests adding a CLI (Command-Line Interface) version of the video-content-agent using libraries from [Charm](https://charm.land/), an open-source collection of tools for building beautiful terminal applications.

## Motivation

The current video-content-agent is primarily a programmatic library. A CLI interface would:

1. **Improve Accessibility**: Users without programming knowledge could use the tool directly
2. **Better User Experience**: Interactive terminal UI provides real-time feedback and progress visibility
3. **Professional Presentation**: Charm libraries create polished, visually appealing terminal applications
4. **Ease of Use**: No need to write code to use the agent

## Proposed Implementation

Using Charm's ecosystem of libraries:

### Recommended Libraries

1. **[Huh](https://github.com/charmbracelet/huh)** - Interactive terminal forms
   - Used for topic input and user approval prompts
   - Provides a clean interface for script review and feedback

2. **[Bubble Tea](https://github.com/charmbracelet/bubbletea)** - Terminal UI framework
   - Build the overall CLI structure and navigation
   - Handle state management during the video generation pipeline

3. **[Lip Gloss](https://github.com/charmbracelet/lipgloss)** - Terminal styling
   - Professional UI layout and styling
   - Consistent visual theme across the application

4. **[Spinner](https://github.com/charmbracelet/bubbletea)** - Loading indicators
   - Display progress during research, scripting, audio, and video generation stages
   - Real-time status updates

5. **[Log](https://github.com/charmbracelet/log)** - Structured logging
   - Log API calls and system events
   - Help with debugging

## Architecture

The CLI would wrap the existing agent code:

```
cli/
├── cmd/
│   └── main.go              # Bubble Tea application entry point
├── ui/
│   ├── forms.go             # Huh-based input forms
│   ├── styles.go            # Lip Gloss styling definitions
│   └── components.go        # Reusable UI components
├── handlers/
│   ├── research.go          # Handle research stage with spinner
│   ├── scripting.go         # Script generation and approval
│   ├── audio.go             # Audio generation with progress
│   └── video.go             # Video generation with status
└── utils/
    └── helpers.go           # Utility functions
```

## User Flow

1. User runs `./video-agent-cli`
2. Presented with a welcome screen and topic input form
3. Real-time progress indicators for each stage:
   - 🔍 Research Phase
   - 📝 Script Generation
   - 👤 Human Review (interactive approval with Huh)
   - 🎙️ Audio Generation
   - 🎥 Video Production
4. Final output information and file location
5. Option to generate another video or exit

## Benefits

- **Zero Code Requirement**: Run from terminal without writing any code
- **Better Feedback**: See what the agent is doing in real-time
- **Professional Look**: Charm libraries create modern, beautiful CLI interfaces
- **Accessible**: Users on servers without GUI can still use the tool
- **Maintainable**: Charm is actively maintained and well-documented

## Integration Points

- Existing TypeScript agents remain unchanged
- CLI calls the existing `index.ts` entry point
- Environment variables loaded from `.env`
- All authentication handled by existing Composio setup

## Next Steps

1. Research Charm libraries integration with Node.js
2. Prototype interactive input forms with Huh
3. Implement progress indicators
4. Create end-to-end CLI wrapper
5. Test with various use cases

## References

- [Charm.land](https://charm.land/)
- [Charm on GitHub](https://github.com/charmbracelet)
- Relevant libraries: Huh, Bubble Tea, Lip Gloss, Spinner, Log

## Discussion

Feedback is welcome! Please comment on:
- Library choices
- UI/UX design
- Implementation approach
- Priority compared to other features
