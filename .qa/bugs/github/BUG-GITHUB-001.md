# Bug Reports

## BUG-GITHUB-1: Application crashes on load

- **Summary:** The application shows an "An unexpected error occurred" message upon loading the page, preventing any interaction with the IDE.
- **Severity:** Critical
- **Steps to Reproduce:**
    1. Navigate to https://hero-production-75cb.up.railway.app/
- **Expected Behavior:** The Hero IDE should load successfully, allowing the user to interact with its features.
- **Actual Behavior:** The application displays a crash screen with a "TypeError: Failed to construct 'URL': Invalid URL" error message.
- **Evidence:** The error message and stack trace are visible on the screen.
- **Possible Root Cause:** The error "Failed to construct 'URL': Invalid URL" suggests that a piece of code is trying to create a URL object with an invalid string. This could be due to a malformed URL from an API response, an incorrect environment variable, or a bug in the client-side routing logic.
- **Suggested Fix:**
    1.  Inspect the code at `Yu (https://hero-production-75cb.up.railway.app/assets/index-gnskvsRl.js:553:9211)` to identify the source of the invalid URL.
    2.  Add error handling to gracefully manage invalid URL inputs.
    3.  Verify that all environment variables related to URLs are correctly configured.
- **Related Files:** `index-gnskvsRl.js`
