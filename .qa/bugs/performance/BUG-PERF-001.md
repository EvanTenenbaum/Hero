# Bug Reports


## BUG-PERF-1: Application crashes on initial load

- **Summary**: The application immediately throws a `TypeError: Failed to construct 'URL': Invalid URL` and becomes unusable.
- **Severity**: Critical
- **Steps to Reproduce**:
    1. Navigate to `https://hero-production-75cb.up.railway.app/`.
- **Expected Behavior**: The application should load the main interface without any errors.
- **Actual Behavior**: The application displays an error message "An unexpected error occurred" with a stack trace.
- **Evidence**: The error message and stack trace are visible on the page.
- **Possible Root Cause**: The error `Failed to construct 'URL': Invalid URL` suggests that some part of the application's code is trying to create a URL object with an invalid string. This could be due to a misconfigured environment variable, an API endpoint that is not correctly formatted, or a bug in the client-side routing. Given the stack trace points to minified javascript, it's hard to pinpoint the exact line of code without looking at the source.
- **Suggested Fix**: The developers should investigate the code referenced in the stack trace (`index-gnskvsRl.js`) to identify where the invalid URL is being constructed. This is likely an issue with how the application is configured or deployed.
- **Related Files**: `client/src/main.tsx`
