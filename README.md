# Abigail, the annoying AI

Chat with a virtual Abigail — dry, sarcastic, and still somehow helpful.

Live: [mich8060.github.io/ai-abigail](https://mich8060.github.io/ai-abigail/)

## ChatGPT on GitHub Pages

GitHub Pages is static, so the OpenAI key cannot go in the frontend. GitHub Actions uses the `OPENAI_API_KEY` repo secret to deploy a Cloudflare Worker, and the site calls that Worker.

Add these repo secrets, then push or re-run **Deploy GitHub Pages**:

- `OPENAI_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Local

1. Copy your key into `.env` as `OPENAI_API_KEY=...`
2. `npm install`
3. `npm run dev`
