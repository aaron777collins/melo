# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "Welcome to Melo" [level=1] [ref=e5]
  - paragraph [ref=e6]: Sign in to your Matrix account
  - generic [ref=e7]:
    - generic [ref=e8]:
      - text: Homeserver
      - textbox "https://matrix.org" [disabled] [ref=e9]
    - generic [ref=e10]:
      - text: Username
      - textbox "@user:matrix.org or just username" [disabled] [ref=e11]
    - generic [ref=e12]:
      - text: Password
      - textbox "Your password" [disabled] [ref=e13]
    - button "Signing In..." [disabled] [ref=e14]
  - paragraph [ref=e16]:
    - text: Don't have an account?
    - link "Create one here" [ref=e17] [cursor=pointer]:
      - /url: /sign-up
  - paragraph [ref=e19]: Melo uses the Matrix protocol for secure, decentralized communication. Use your existing Matrix account or register on any Matrix homeserver.
```