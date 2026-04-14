# Cloudflare Pages Setup Checklist — 103ready.com

Step-by-step guide to get `103ready.com` live, serving the Twine scenarios from the `hmadison-design/103ready` GitHub repo. Written assuming no prior familiarity with the Cloudflare UI — every click is spelled out.

**Time estimate:** 30–60 minutes, mostly waiting on DNS propagation.

---

## Prerequisites (verify before starting)

- [ ] `hmadison-design/103ready` repo exists on GitHub and is up to date on `main`
- [ ] Domain `103ready.com` is registered at Netim (same registrar as flyingm.aero)
- [ ] You are signed in to the Cloudflare account that already hosts `flyingm.aero` (`Hmadison@flyingm.aero`)
- [ ] You are signed in to GitHub in the same browser as `hmadison-design`

---

## Step 0 — Add a landing page to the repo

When visitors hit `https://103ready.com/`, something has to load at `/`. The current repo has no `index.html` at the publish root, so without this step you get a 404.

Easiest approach — add a tiny hand-written `index.html` inside a new `public/` directory, and have the build step copy it to `output/`.

1. [ ] Create `103ready/public/index.html` with a title, one-sentence description, and three links:
      - `Game_Day_Import.html`
      - `The_Wall_Import.html`
      - `Cylinder_Three_Import.html`
2. [ ] Edit `103ready/tools/convert_twee.py` — at the very end of the script, copy `public/index.html` into `output/index.html`. (If you'd rather, I can do both of these in the next session — they take five minutes.)
3. [ ] Commit and push to `main`.

If you're in a hurry and want to skip this, Cloudflare will still deploy — you'll just have to tell people to visit `https://103ready.com/Game_Day_Import.html` directly. You can add the landing page later.

---

## Step 1 — Open Cloudflare Workers & Pages

1. [ ] Go to `https://dash.cloudflare.com` and sign in.
2. [ ] In the left sidebar, under the **Build** heading, click **Compute** to expand it, then click **Workers & Pages**.
3. [ ] You should see your existing `flyingm` application in the list. Leave it alone.

---

## Step 2 — Start creating the new project

1. [ ] Click the blue **Create application** button in the top-right of the Workers & Pages page.
2. [ ] On the next screen, click the **Pages** tab (the page defaults to **Workers** — do not stay on that tab).
   - If you do not see a **Pages** tab, look instead for a button/link labeled **Import an existing Git repository** or **Connect to Git** or **Deploy a static site**. Cloudflare has been renaming this flow; any of those options land you in the same place.
3. [ ] Click **Connect to Git**.

---

## Step 3 — Authorize and select the repo

1. [ ] Cloudflare will ask you to connect GitHub. Click **Connect GitHub**.
2. [ ] A GitHub authorization window opens. Sign in to the `hmadison-design` account if prompted.
3. [ ] GitHub asks which repos Cloudflare can access. Choose **Only select repositories**, then pick `hmadison-design/103ready`. (Avoid "All repositories" — least-privilege is better.) Click **Install & Authorize**.
4. [ ] Back in Cloudflare, the `103ready` repo should now appear in the list. Click it, then click **Begin setup** (or **Next**).

---

## Step 4 — Configure the build settings

This is the screen where the `python3 tools/convert_twee.py` command goes.

1. [ ] **Project name:** `103ready` — this becomes your free default URL at `https://103ready.pages.dev`. Use lowercase, no spaces.
2. [ ] **Production branch:** `main`
3. [ ] Expand the **Build settings** section (if collapsed).
4. [ ] **Framework preset:** `None`
5. [ ] **Build command:** paste exactly this — `python3 tools/convert_twee.py`
6. [ ] **Build output directory:** `output`
7. [ ] **Root directory (advanced):** leave blank
8. [ ] **Environment variables (advanced):** none for the first deploy. If the build later fails complaining about Python version, come back here and add a variable named `PYTHON_VERSION` with value `3.11`.
9. [ ] Click **Save and Deploy**.

---

## Step 5 — Watch the first deploy

1. [ ] You're now on the project page. A build is running. Click it to see live logs.
2. [ ] Wait 1–3 minutes. You're looking for a green "Success" indicator at the end.
3. [ ] When it succeeds, Cloudflare shows a link like `https://103ready.pages.dev`. Click it.
4. [ ] Confirm the scenario loads by adding the filename to the URL, e.g. `https://103ready.pages.dev/Game_Day_Import.html`. Click through a few passages to confirm it works.

**If the build fails**, open the log, look at the red error. Most common causes and fixes:

| Error contains | Fix |
|--|--|
| `python3: command not found` | Add env var `PYTHON_VERSION=3.11` (Step 4 #8) and retry |
| `No such file or directory` referencing a scenarios path | The build container is running from the repo root — verify the paths in `convert_twee.py` are relative to the repo root, not absolute |
| `Output directory 'output' not found` | The script didn't create `output/`. Either add `os.makedirs('output', exist_ok=True)` to the script, or pre-commit an empty `output/.gitkeep` file |

You can re-trigger the build after any fix by pushing to `main`, or by clicking **Create new deployment → Retry** on the project page.

---

## Step 6 — Attach the custom domain `103ready.com`

1. [ ] On the `103ready` project page, click the **Custom domains** tab (top of the project page, next to **Deployments**, **Metrics**, **Settings**).
2. [ ] Click **Set up a custom domain**.
3. [ ] Type `103ready.com` into the domain field. Click **Continue**.
4. [ ] Cloudflare checks whether `103ready.com` is already a domain in your Cloudflare account.
      - If it IS in your account already → Cloudflare will auto-create the DNS record. Skip to Step 8.
      - If it is NOT in your account → Cloudflare says "This domain is not in your Cloudflare account. Add it." Proceed to Step 7 first.

---

## Step 7 — Add 103ready.com to Cloudflare (only if Step 6 said it wasn't in your account)

1. [ ] Keep the Custom Domains tab open in one browser tab. In a new tab, go to `https://dash.cloudflare.com`.
2. [ ] In the left sidebar, click **Domains → Websites** (or just **Websites** at the very top of the sidebar, depending on your dashboard layout).
3. [ ] Click **Add a domain** (also sometimes labeled **Add site** or **+ Add**).
4. [ ] Type `103ready.com`, click **Continue**.
5. [ ] Select the **Free** plan. Click **Continue**.
6. [ ] Cloudflare scans existing DNS — since the domain has never been used, the scan will be empty. That's fine. Click **Continue**.
7. [ ] Cloudflare now shows a screen titled **Change your nameservers**. It displays two nameservers assigned to your account, like:
      - `xxx.ns.cloudflare.com`
      - `yyy.ns.cloudflare.com`

      **Copy both of these somewhere** (sticky note, text file) — you'll paste them into Netim in the next step.

8. [ ] Leave this Cloudflare tab open. Keep going with Step 8.

---

## Step 8 — Point Netim at Cloudflare

1. [ ] Open a new browser tab and sign in to Netim at `https://www.netim.com`.
2. [ ] Navigate to your domain list. Click `103ready.com`.
3. [ ] Find the section labeled **DNS servers** or **Nameservers** (Netim sometimes calls this "Name servers" or "NS servers" under a Configuration/DNS tab).
4. [ ] You'll see Netim's default nameservers listed (something like `ns1.netim.net`, `ns2.netim.net`, etc.). Replace all of them with the two Cloudflare nameservers you copied in Step 7.
      - Nameserver 1: the first Cloudflare NS (e.g. `xxx.ns.cloudflare.com`)
      - Nameserver 2: the second Cloudflare NS (e.g. `yyy.ns.cloudflare.com`)
      - If Netim requires a minimum of 2 (or exactly 2) NS entries, just leave it at two. If it had more, delete the extras.
5. [ ] Save. Netim pushes the change to the domain registry within minutes, but full global DNS propagation can take 2–24 hours.
6. [ ] Switch back to the Cloudflare tab from Step 7. Click **Done, check nameservers** (or **Continue**). Cloudflare will begin checking; it will mark the domain **Active** as soon as it confirms the NS change, usually within an hour.

---

## Step 9 — Finish attaching the custom domain to the Pages project

Once Cloudflare shows `103ready.com` as **Active** in your Websites list:

1. [ ] Go back to **Workers & Pages → 103ready → Custom domains**.
2. [ ] If it's still showing the "Set up a custom domain" prompt from Step 6, click **Set up a custom domain** again, enter `103ready.com`, and this time Cloudflare should auto-create the DNS record and finish attaching.
3. [ ] Repeat: click **Set up a custom domain** a second time and enter `www.103ready.com`. This makes both `103ready.com` and `www.103ready.com` serve the site.
4. [ ] Wait 5–15 minutes for Cloudflare's Universal SSL certificate to provision. You'll see a "Verifying" or "Initializing" status next to each domain — that's normal. Once it says **Active**, HTTPS works.

---

## Step 10 — Verify

- [ ] `https://103ready.com/` loads the landing page (or the scenario URL if you skipped Step 0).
- [ ] `https://www.103ready.com/` loads.
- [ ] `https://103ready.com/Game_Day_Import.html` loads and passages work.
- [ ] TLS padlock is green / no certificate warnings.
- [ ] Push any trivial change to the repo's `main` branch (e.g. edit the README). Within a minute, Cloudflare should show a new deployment building and then live.

---

## Step 11 — Optional hardening (do any time)

- [ ] Cloudflare → `103ready.com` site → **SSL/TLS** → set encryption mode to **Full**. (Not "Flexible" — Pages speaks HTTPS on its end.)
- [ ] Same SSL/TLS section → **Edge Certificates** → turn on **Always Use HTTPS**.
- [ ] Cloudflare → `103ready.com` site → **Rules → Redirect Rules** → add a redirect from `www.103ready.com` → `103ready.com` (or the reverse if you prefer `www` as canonical).
- [ ] Pages project → **Settings → Builds & deployments** → confirm **Preview deployments** is enabled. Any branch other than `main` will get its own preview URL — handy for testing scenario edits before merging.

---

## Troubleshooting cheatsheet

| Symptom | Likely cause | Fix |
|--|--|--|
| `103ready.com` shows a Netim parking page | Nameservers haven't propagated yet | Wait 1–4 hours. Run `dig NS 103ready.com` in Terminal to see what the world currently resolves |
| Cloudflare stuck on "Checking nameservers" after 24 hours | Netim didn't actually apply the NS change | Recheck Netim, re-save, contact Netim support if needed |
| Pages build fails with Python error | Wrong Python version | Add env var `PYTHON_VERSION=3.11` in Pages → Settings → Environment variables |
| 404 at `103ready.com/` but scenarios load when named directly | No `index.html` at publish root | Do Step 0 |
| Scenario loads but audio/images 404 | Asset paths reference `audio/…` but those dirs aren't inside `output/` | Update `convert_twee.py` to also copy `scenarios/<name>/audio/` and `…/images/` into `output/` |
| Mixed-content warnings in the browser console | A hardcoded `http://` asset URL in a scenario | `grep -r "http://" scenarios/` and fix any you find |

---

## When you're done

Commit this checklist so future-you has the record:

```bash
cd ~/Downloads/Claude\ Workspace/CYOA/103ready
git add docs/cloudflare_setup_checklist.md
git commit -m "Add Cloudflare Pages setup checklist for 103ready.com"
git push
```
