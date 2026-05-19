# Security Policy

## Supported Versions

Only the latest stable version of Lumi receives security updates.

| Version                   | Supported          |
|---------------------------|--------------------|
| Latest stable version     | :white_check_mark: |
| Previous versions         | :x:                |

## Reporting a Vulnerability

If you find a security vulnerability in Lumi, **do not open a public issue**.

Email: **hot-pottatoes@proton.me**

I will respond within 48 hours with next steps. If the vulnerability is confirmed,
I will work on a fix and release a new stable version as soon as possible.
If declined, I will explain why.

## Scope

- **LumiC:** C++ compiler. Compilation vulnerabilities, code injection.
- **LumiJS:** Client-side compiler. XSS, HTML/JavaScript injection.

## Best Practices for Users

- Keep Lumi updated to the latest stable version
- Do not process Lumi code from untrusted sources without additional sanitization
- Report suspicious behavior immediately
