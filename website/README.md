# Youmotion website

Static, dependency-free launch site for `youmotion.app`. It contains the English
and German marketing pages, app privacy policy, separate website privacy policy,
terms, support, and imprint.

Store buttons link to the live public store URLs. Keep `data-store-state="live"`
on the English and German pages; the store URLs also live in
`assets/pulse.js` (`storeLinks`).

## Cloudflare Pages

1. Create a Pages project named `youmotion-app` from this repository, or run
   `npx wrangler pages project create youmotion-app`.
2. Set the build output directory to `website`; no build command is needed.
3. Deploy with `npx wrangler pages deploy website --project-name youmotion-app`.
4. Attach the custom domain `youmotion.app` and verify HTTPS.
5. Verify every URL in `../store/SUBMIT-TODAY.md` before adding it to a store.

Do not enable analytics or forms without first updating the website privacy
policy. App journal data is not used by this website.

## Source-link checks

Run `node scripts/verify-website.mjs` from the repository root. It checks the localized GitHub link in every footer, both landing sections and support pages, preserves email support, and compares documented store descriptions with their upload sources. No credentials, network, or teardown are required. Before deploying these staged links, confirm that https://github.com/thorgas/Youmotion is anonymously accessible and the open-source review is resolved.

The HTTP integration suite uses the installed `e2e` framework and a temporary localhost server. It checks the served English/German pages and source-link placement; it does not drive a browser or establish visual layout, GitHub availability, or deployed-site behavior. Install the locked dependencies first (`pnpm install --frozen-lockfile`, Node.js matching the repository setup), then run from the repository root:

```sh
E2E_TELEMETRY_DISABLED=1 node node_modules/e2e/dist/cli/bin.js run --config e2e.website.config.ts
```

No device, production credentials, or external network is needed. Permit the local listener if your sandbox requires it. The suite closes its server automatically; reports are written to ignored `artifacts/e2e-website/`.
