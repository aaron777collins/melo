# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "Welcome to Melo" [level=1] [ref=e5]
    - generic [ref=e6]:
      - img [ref=e7]
      - generic [ref=e9]: Private Server
    - paragraph [ref=e10]: Sign in to dev2.aaroncollins.info
    - paragraph [ref=e12]: Invalid username or password
    - generic [ref=e13]:
      - generic [ref=e14]:
        - img [ref=e15]
        - generic [ref=e18]: dev2.aaroncollins.info
      - generic [ref=e19]:
        - generic [ref=e20]: Username
        - textbox "username" [ref=e21]: e2etest-1771474881322
      - generic [ref=e22]:
        - generic [ref=e23]: Password
        - textbox "Your password" [ref=e24]: FreshTest2026!
      - button "Sign In" [ref=e25] [cursor=pointer]
    - paragraph [ref=e27]:
      - text: Don't have an account?
      - link "Create one here" [ref=e28] [cursor=pointer]:
        - /url: /sign-up
    - paragraph [ref=e30]: This is a private Melo instance. Only accounts from the configured homeserver can sign in.
  - alert [ref=e31]
```