# UI Reference Screenshots

**Status:** Pending (requires auth setup)

## Required Screenshots

The following screenshots should be captured from the discord-clone reference app once authentication is configured:

### Core Layout
- [ ] Full application layout (dark mode)
- [ ] Full application layout (light mode)

### Navigation Sidebar
- [ ] Server list with icons
- [ ] Add server button hover state
- [ ] Server icon hover/selected states

### Server Sidebar
- [ ] Channel list (collapsed categories)
- [ ] Channel list (expanded categories)
- [ ] Text channel hover state
- [ ] Voice channel hover state
- [ ] Member list section

### Chat Area
- [ ] Empty channel welcome
- [ ] Messages (various states)
- [ ] Message with reactions
- [ ] Message editing
- [ ] Message with attachments

### Modals
- [ ] Create server modal
- [ ] Create channel modal
- [ ] Invite modal
- [ ] Server settings modal
- [ ] Members modal

### Input Area
- [ ] Message input (empty)
- [ ] Message input (with text)
- [ ] File upload preview
- [ ] Emoji picker

## Capturing Screenshots

Use browser automation to capture:

```bash
# Start the reference app
cd /tmp/discord-clone-ref
npm run dev

# Use browser tool to navigate and screenshot
browser action=screenshot profile=chrome
```

## Alternative: Discord Reference

For authentic Discord UI reference, compare with:
- [Discord official screenshots](https://discord.com/branding)
- Live Discord app (browser or desktop)

## Notes

Screenshots will be added in Phase 2 when the auth configuration is complete, or may use actual Discord screenshots for visual reference.
