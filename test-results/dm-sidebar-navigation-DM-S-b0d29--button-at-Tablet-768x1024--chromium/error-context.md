# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e5]:
    - heading "Welcome to Melo" [level=1] [ref=e6]
    - generic [ref=e7]:
      - img [ref=e8]
      - generic [ref=e10]: Private Server
    - paragraph [ref=e11]: Sign in to dev2.aaroncollins.info
    - generic [ref=e12]:
      - generic [ref=e13]:
        - img [ref=e14]
        - generic [ref=e17]: dev2.aaroncollins.info
      - generic [ref=e18]:
        - generic [ref=e19]: Username
        - textbox "username" [ref=e20]
      - generic [ref=e21]:
        - generic [ref=e22]: Password
        - textbox "Your password" [ref=e23]
      - button "Sign In" [ref=e24] [cursor=pointer]
    - paragraph [ref=e26]:
      - text: Don't have an account?
      - link "Create one here" [ref=e27] [cursor=pointer]:
        - /url: /sign-up
    - paragraph [ref=e29]: This is a private Melo instance. Only accounts from the configured homeserver can sign in.
```