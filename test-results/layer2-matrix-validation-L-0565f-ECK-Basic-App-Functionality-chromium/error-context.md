# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]: Melo
  - navigation "Skip to content" [ref=e3]:
    - link "Skip to main content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - link "Skip to navigation" [ref=e5] [cursor=pointer]:
      - /url: "#navigation-sidebar"
    - link "Skip to message input" [ref=e6] [cursor=pointer]:
      - /url: "#chat-input"
    - link "Skip to member list" [ref=e7] [cursor=pointer]:
      - /url: "#member-list"
  - region "Keyboard navigation help" [ref=e12]:
    - heading "Keyboard Navigation" [level=2] [ref=e13]
    - list [ref=e14]:
      - listitem [ref=e15]: "Tab: Navigate between interactive elements"
      - listitem [ref=e16]: "Shift + Tab: Navigate backwards"
      - listitem [ref=e17]: "Enter or Space: Activate buttons and links"
      - listitem [ref=e18]: "Arrow keys: Navigate within lists and menus"
      - listitem [ref=e19]: "Escape: Close dialogs and menus"
      - listitem [ref=e20]: "Alt + Up/Down: Navigate between channels"
      - listitem [ref=e21]: "Ctrl + K: Open search (when implemented)"
  - application "Melo Chat Application" [ref=e22]:
    - main "Chat interface main content" [ref=e24]
```