# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - heading "Welcome to Melo" [level=1] [ref=e5]
    - generic [ref=e6]:
      - img [ref=e7]
      - generic [ref=e9]: Private Server
    - paragraph [ref=e10]: Sign in to dev2.aaroncollins.info
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img [ref=e13]
        - generic [ref=e16]: dev2.aaroncollins.info
      - generic [ref=e17]:
        - generic [ref=e18]: Username
        - textbox "username" [ref=e19]
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - textbox "Your password" [active] [ref=e22]: somepassword
      - button "Sign In" [ref=e23] [cursor=pointer]
    - paragraph [ref=e25]:
      - text: Don't have an account?
      - link "Create one here" [ref=e26] [cursor=pointer]:
        - /url: /sign-up
    - paragraph [ref=e28]: This is a private Melo instance. Only accounts from the configured homeserver can sign in.
  - alert [ref=e29]
```