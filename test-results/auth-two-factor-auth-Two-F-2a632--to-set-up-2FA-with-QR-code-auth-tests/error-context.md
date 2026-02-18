# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "Welcome to Melo" [level=1] [ref=e5]
    - paragraph [ref=e6]: Sign in to your Matrix account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Homeserver
        - textbox "https://matrix.org" [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e12]: Username
        - textbox "@user:matrix.org or just username" [ref=e13]
      - generic [ref=e14]:
        - generic [ref=e15]: Password
        - textbox "Your password" [ref=e16]
      - button "Sign In" [disabled] [ref=e17]
    - paragraph [ref=e19]:
      - text: Don't have an account?
      - link "Create one here" [ref=e20] [cursor=pointer]:
        - /url: /sign-up
    - paragraph [ref=e22]: Melo uses the Matrix protocol for secure, decentralized communication. Use your existing Matrix account or register on any Matrix homeserver.
  - alert [ref=e23]
```