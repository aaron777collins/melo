# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "Create Account" [level=1] [ref=e5]
    - generic [ref=e6]:
      - img [ref=e7]
      - generic [ref=e9]: Private Server
    - paragraph [ref=e10]: Create an account on dev2.aaroncollins.info
    - generic [ref=e11]:
      - generic [ref=e12]:
        - img [ref=e13]
        - generic [ref=e16]: dev2.aaroncollins.info
      - generic [ref=e17]:
        - generic [ref=e18]: Username
        - textbox "Choose a username" [ref=e19]
        - paragraph [ref=e20]: Your Matrix ID will be @username:dev2.aaroncollins.info
      - generic [ref=e21]:
        - generic [ref=e22]: Email (optional)
        - textbox "your.email@example.com" [ref=e23]
        - paragraph [ref=e24]: For account recovery and verification
      - generic [ref=e25]:
        - generic [ref=e26]: Password
        - textbox "Create a strong password" [ref=e27]
      - generic [ref=e28]:
        - generic [ref=e29]: Confirm Password
        - textbox "Confirm your password" [ref=e30]
      - button "Create Account" [disabled] [ref=e31]
    - paragraph [ref=e33]:
      - text: Already have an account?
      - link "Sign in here" [ref=e34] [cursor=pointer]:
        - /url: /sign-in
    - paragraph [ref=e36]: This is a private Melo instance. Only accounts from the configured homeserver can be created.
  - alert [ref=e37]
```