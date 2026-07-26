<div align="center">

# Interactive CV / Portfolio

**A dynamic resume featuring an interactive background, multilingual support, and spam protection.**

![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Backend-F38020?logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla-JS-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-CC_BY--SA_4.0-31393F?logo=creativecommons&logoColor=white)

</div>

---

## Download Resume (PDF)

The project supports the generation of beautifully styled PDF versions of the resume. In production, files are served with maximum gzip compression and decompressed directly in the user's browser.

- 🇬🇧 **English**: [Download CV (PDF)](./public/pdf/cv-en.pdf)
- 🇷🇺 **Русский**: [Download CV (PDF)](./public/pdf/cv-ru.pdf)
- 🇫🇷 **Français**: [Download CV (PDF)](./public/pdf/cv-fr.pdf)

---

## Project Features

- **Interactive Hero Screen:** Animated background on a `<canvas>` inside an `<iframe>`, reacting to user actions (drawing mode).
- **Multilingual (i18n):** Full support for English, Russian, and French. Translations are stored in a convenient `CONTENT.toml` format and parsed on the fly.
- **Smart Spam Protection:** The contact form uses a Proof-of-Work (PoW) system and time delays on the Cloudflare Worker side to completely eliminate bots without using CAPTCHA.
- **Secure Contact Reveal:** Email and Telegram are no longer exposed in the source code. They are provided by the worker only after the client solves a cryptographic challenge (PoW).
- **Optimized PDF Export:** In development mode, the button generates a PDF on the fly via `window.print()`. In production, it serves pre-compressed `.gz` files that are decompressed via the `DecompressionStream` API.
- **Stale Data Protection:** The `pre-push` Git hook automatically checks if PDF renders have been updated after changes to content (`CONTENT.toml`) or styles. If the code is newer than the PDF, the push is blocked.

---

## Design Palette

The project is built on a strict color system. Below are the primary colors used in the design (from backgrounds to accents).

<table>
  <tr>
    <th>Group</th>
    <th>Hex Code</th>
    <th>Description</th>
  </tr>
  <tr>
    <td rowspan="2" align="center"><b>Backgrounds</b></td>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#070D15; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#070D15</code></td>
    <td>Primary dark background (Hero, Topbar)</td>
  </tr>
  <tr>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#EDEDEE; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#EDEDEE</code></td>
    <td>Primary light background (Content Area)</td>
  </tr>
  <tr>
    <td rowspan="6" align="center"><b>Curves / Pattern</b></td>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#10263D; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#10263D</code></td>
    <td>Darkest pattern element / Secondary text</td>
  </tr>
  <tr>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#19426A; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#19426A</code></td>
    <td>Deep blue pattern</td>
  </tr>
  <tr>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#30619B; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#30619B</code></td>
    <td>Medium blue pattern</td>
  </tr>
  <tr>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#6085C4; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#6085C4</code></td>
    <td>Light blue pattern</td>
  </tr>
  <tr>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#889FC9; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#889FC9</code></td>
    <td>Pale blue pattern</td>
  </tr>
  <tr>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#AFB9CA; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#AFB9CA</code></td>
    <td>Lightest pattern element / Borders</td>
  </tr>
  <tr>
    <td rowspan="1" align="center"><b>Accent</b></td>
    <td align="center"><span style="display:inline-block; width:12px; height:12px; background-color:#5F9F59; border:1px solid #ccc; border-radius:2px; vertical-align:middle; margin-right:5px;"></span><code>#5F9F59</code></td>
    <td>Primary accent color (buttons, links, highlights)</td>
  </tr>
</table>

---

## Technology Stack

| Client (Frontend) | Server (Backend) | Infrastructure |
| :--- | :--- | :--- |
| Vanilla JS (ES6+ Modules) | Cloudflare Workers | Vite (Bundler) |
| CSS Variables & Grid | Web Crypto API (SHA-256) | GitHub Pages (Hosting) |
| TOML parser (i18n) | KV Storage (Rate Limiting) | Git Hooks (Automation) |

---

## Local Launch and Build

To run the project locally, make sure you have Node.js installed.

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (with HTTPS for testing Crypto API)
npm run dev

# 3. Build for production
npm run build

# 4. Preview the built version
npm run preview
```

<details>
<summary><b>Git Hooks Automation (Optional)</b></summary>

The project includes a script to protect against pushing stale PDF renders.

1. The `scripts/check-pdfs.js` script compares the modification time of PDF files with content and style files (`CONTENT.toml`, `index.html`, `src/scripts/`, `src/styles/`).
2. If the code was changed later than the PDF, the push is interrupted with an error.
3. To activate the hook, create a file `.git/hooks/pre-push` (or `.githooks/pre-push` if `core.hooksPath` is configured) with the following content:
   ```bash
   node scripts/check-pdfs.js
   ```
4. Make the file executable: `chmod +x .git/hooks/pre-push`.
5. If you need to bypass the check, use the flag: `git push --no-verify`.

</details>

---

## Project Structure

```
├── public/
│   ├── assets/            # Images
│   └── pdf/               # Source PDF resume files
├── cloudflare/
│   └── worker.js          # Backend for the contact form
├── scripts/
│   ├── check-pdfs.js      # Git hook script to check PDF freshness
│   └── compress-pdfs.js   # PDF gzip compression script during build
├── src/
│   ├── scripts/           # Modular JavaScript (i18n, render, modals, export)
│   └── styles/            # CSS (variables, components, print)
├── CONTENT.toml           # All text content and translations
├── index.html             # Main HTML file
└── vite.config.js         # Vite configuration
```

---

<div align="center">

🄯 2026  
Built with VSCodium, GLM 5.2, Vite and a lot of Coffee.  
This work is licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
</div>