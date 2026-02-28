# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - heading "Create Account" [level=1] [ref=e5]
    - generic [ref=e6]:
      - img [ref=e7]
      - generic [ref=e9]: Private Server
    - paragraph [ref=e10]: Create an account on dev2.aaroncollins.info
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Username
        - textbox "Choose a username" [ref=e14]: sophietest
        - generic [ref=e16]: ✓ Username available
      - generic [ref=e17]:
        - generic [ref=e18]: Email (optional)
        - textbox "your.email@example.com" [ref=e19]
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - textbox "Create a strong password" [active] [ref=e22]: SophieTest2026!
        - generic [ref=e24]:
          - generic [ref=e25]: "Strength:"
          - generic [ref=e26]: Strong
      - generic [ref=e29]:
        - generic [ref=e30]: Confirm Password
        - textbox "Confirm Password" [ref=e31]:
          - /placeholder: Confirm your password
      - button "Create Account" [disabled] [ref=e32]
    - paragraph [ref=e34]:
      - text: Already have an account?
      - link "Sign in here" [ref=e35] [cursor=pointer]:
        - /url: /sign-in
  - alert [ref=e36]
```