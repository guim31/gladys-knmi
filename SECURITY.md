# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

What the integration handles:

- **The Weerlive API key** lives in the Gladys configuration (a `secret`
  field). It is sent only to `weerlive.nl`, over HTTPS, in the request URL as
  the API requires; it is never logged, never written under `/data`, never put
  in an error message.
- **The location of the chosen Gladys house** (the manifest asks for
  `location`) is rounded to two decimals (about 1 km) before being sent to
  Weerlive. The other houses are never used.
- **`/data`** holds `knmi-state.json`: the last weather reading of each place
  and the last KNMI warning seen. No secret, no personal data beyond the place
  names typed by the user.
- **Network**: outgoing HTTPS requests to `weerlive.nl` only. The container
  listens on no port.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and the Weerlive and KNMI services.
