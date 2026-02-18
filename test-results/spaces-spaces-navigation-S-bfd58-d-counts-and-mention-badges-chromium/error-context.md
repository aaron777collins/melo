# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "Welcome to Melo" [level=1] [ref=e5]
    - paragraph [ref=e6]: Sign in to your Matrix account
    - paragraph [ref=e8]: Rate limit exceeded. Maximum 5 requests per 900 seconds.
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Homeserver
        - textbox "https://matrix.org" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]: Username
        - textbox "@user:matrix.org or just username" [ref=e15]: sophietest
      - generic [ref=e16]:
        - generic [ref=e17]: Password
        - textbox "Your password" [ref=e18]: SophieTest2026!
      - button "Sign In" [ref=e19] [cursor=pointer]
    - paragraph [ref=e21]:
      - text: Don't have an account?
      - link "Create one here" [ref=e22] [cursor=pointer]:
        - /url: /sign-up
    - paragraph [ref=e24]: Melo uses the Matrix protocol for secure, decentralized communication. Use your existing Matrix account or register on any Matrix homeserver.
  - alert [ref=e25]
```