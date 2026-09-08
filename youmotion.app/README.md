# Youmotion website

Static, dependency-free launch site for `youmotion.app`. It contains the English
and German marketing pages, app privacy policy, separate website privacy policy,
terms, support, and imprint.

Store buttons intentionally say **Coming soon / Bald verfügbar** until the public
store URLs exist.

## Cloudflare Pages

1. Create a Pages project named `youmotion-app` from this repository, or run
   `npx wrangler pages project create youmotion-app`.
2. Set the build output directory to `youmotion.app`; no build command is needed.
3. Deploy with `npx wrangler pages deploy youmotion.app --project-name youmotion-app`.
4. Attach the custom domain `youmotion.app` and verify HTTPS.
5. Verify every URL in `../store/SUBMIT-TODAY.md` before adding it to a store.

Do not enable analytics or forms without first updating the website privacy
policy. App journal data is not used by this website.
