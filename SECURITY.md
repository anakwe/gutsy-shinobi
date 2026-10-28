# Security policy

## Supported code

The active development line is the browser game plus native screensaver work described in [CHANGELOG.md](CHANGELOG.md). Screensaver support is unreleased and still needs target-device lock/resume testing and distribution signing.

## Reporting a vulnerability

Report privately through GitHub's Security > Report a vulnerability feature if available, or through an established private channel to the repository maintainer. Include affected versions, reproduction steps, impact, and a proposed fix if available. Do not post credentials, personal data, or exploit details in public issues. No personal contact information is published in this policy.

## Data and trust boundaries

Browser leaderboards stay in localStorage and are user-editable. Native screensavers load no personal scores or audio and use the packaged offline animation. Webviews have restricted resources/navigation, no JavaScript-to-native bridge, and private/nonpersistent browsing data. Authentication remains the OS's responsibility; enable password-on-resume explicitly.

Screensavers execute with user-session privileges, so trusted code, OS/runtime updates and release signatures remain necessary. The local browser capture tools accept loopback URLs only and retain Chromium's sandbox.

See the dated [security review](docs/security-review.md) for scan results, attribution exceptions, and validation limits. Generated packages, diagnostic captures, browser profiles and signing material must remain outside the commit.
