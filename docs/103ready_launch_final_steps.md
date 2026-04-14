# 103ready.com — Final Launch Steps

Everything except the Cloudflare clicks and the Netim nameserver paste is done and pushed (`42f90ae` on `main`).

## What's already in the repo

- `public/index.html` — black background, centered logo at 50% viewport height, three scenario links in the logo's slate-blue (#1A3C57), hover inverts to white on blue.
- `public/103ready_logo.svg` — the logo you uploaded.
- `build.sh` — Cloudflare build script. Downloads tweego, compiles each `.twee` → playable HTML (`game-day.html`, `the-wall.html`, `cylinder-three.html`), copies the landing page + logo + per-scenario `audio/` and `images/` into `output/`.
- Main Menu button (styled matching the accent color) added to the opening passage **and** every ending passage of all three scenarios. Links to `/` so it returns to the landing page regardless of which scenario they're in. Existing scenario navigation is untouched.

## Steps you still need to do (10–15 min of clicks + DNS wait)

### 1. Create the Cloudflare Pages project — 2 min

In your Cloudflare tab:

1. **Workers & Pages → Create application → Pages tab → Connect to Git**
2. Authorize `hmadison-design` / select the `103ready` repo only → **Begin setup**
3. Fill in:
   - **Project name:** `103ready`
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `bash build.sh`
   - **Build output directory:** `output`
4. **Save and Deploy.** Watch the build log — takes ~2 min. Look for the "Deployment successful" message.
5. Visit `https://103ready.pages.dev/` — you should see the landing page. Click each scenario to confirm they play.

### 2. Attach the custom domain — 3 min

Still in the Pages project:

1. **Custom domains → Set up a custom domain**
2. Enter `103ready.com` → **Continue**
3. Cloudflare will say the domain isn't in your account yet and prompt you to add it as a site. Follow the prompt (Free plan). It will scan DNS (empty is fine) and then show you **two nameservers** like `xxx.ns.cloudflare.com` / `yyy.ns.cloudflare.com`. **Copy both.**
4. Back to the Custom domains tab, also add `www.103ready.com` as a second custom domain.

### 3. Netim nameserver change — 1 min

In your Netim tab (already open):

1. Domain list → `103ready.com` → **DNS servers / Nameservers**
2. Delete Netim's default nameservers.
3. Paste the two Cloudflare nameservers from step 2.3.
4. Save.

### 4. Wait + verify — 15 min to a few hours

1. Cloudflare will show the domain as "Pending" then flip to "Active" once it sees the NS change (usually within an hour, often minutes).
2. SSL certificate provisions automatically after that (~15 min more).
3. `https://103ready.com/` should load. Done.

## If the Cloudflare build fails

The build log will tell you. Most likely cause: tweego download or unzip failed in the Cloudflare container (their build env is Ubuntu with curl/unzip available, so this should Just Work, but networks have bad days).

Fallback: change the build command to `python3 tools/convert_twee.py && cp -r public/. output/` — this produces Twine *import archives* (not playable), but at least gets something deployed so you can troubleshoot the tweego step separately.

## What still remains on the broader launch roadmap

- Dialog editing round-trip (you edit `Game_Day_Dialog_Edit.docx`, I map back to .twee)
- Sound effects from freesound.org
- AI images per scenario
- ElevenLabs phraseology rewrite
- Audio/image integration in Twine
- Repeat for The Wall and Cylinder Three
- Metadata headers for The Wall and Cylinder Three
