# envguard-lite HTTP example

This example starts a small HTTP service with a `/health` endpoint. It loads a root `.env` file, applies defaults, validates required values and supported formats, and prints a generic startup error if validation fails.

From the repository root, copy the dummy values and start the service:

```bash
cp examples/.env.example .env
npm run example
```

Open `http://127.0.0.1:3000/health`. Stop the service with `Ctrl+C`. The template contains no credentials and should not be used to store real secrets in version control.
