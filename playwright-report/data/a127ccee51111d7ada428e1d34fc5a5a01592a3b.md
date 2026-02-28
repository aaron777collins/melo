# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation "Skip to content" [ref=e2]:
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#main-content"
    - link "Skip to navigation" [ref=e4] [cursor=pointer]:
      - /url: "#navigation-sidebar"
    - link "Skip to message input" [ref=e5] [cursor=pointer]:
      - /url: "#chat-input"
    - link "Skip to member list" [ref=e6] [cursor=pointer]:
      - /url: "#member-list"
  - region "Keyboard navigation help" [ref=e11]:
    - heading "Keyboard Navigation" [level=2] [ref=e12]
    - list [ref=e13]:
      - listitem [ref=e14]: "Tab: Navigate between interactive elements"
      - listitem [ref=e15]: "Shift + Tab: Navigate backwards"
      - listitem [ref=e16]: "Enter or Space: Activate buttons and links"
      - listitem [ref=e17]: "Arrow keys: Navigate within lists and menus"
      - listitem [ref=e18]: "Escape: Close dialogs and menus"
      - listitem [ref=e19]: "Alt + Up/Down: Navigate between channels"
      - listitem [ref=e20]: "Ctrl + K: Open search (when implemented)"
  - application "Melo Chat Application" [ref=e21]:
    - navigation "Spaces navigation" [ref=e22]:
      - img [ref=e25]
    - main "Chat interface main content" [ref=e28]:
      - generic [ref=e30]:
        - img [ref=e31]
        - heading "Page Error" [level=2] [ref=e33]
        - paragraph [ref=e34]: This page failed to load properly.
        - generic [ref=e35]:
          - button "Try Again" [ref=e36] [cursor=pointer]:
            - img [ref=e37]
            - text: Try Again
          - button "Go Back" [ref=e42] [cursor=pointer]
  - alert [ref=e43]
```