# Rajesh Arekar Photography

Portfolio website for Rajesh Arekar Photography: wedding, corporate, food and ambience photography, videography, cinematography, drone and LED wall live mixing.

A static site (HTML, CSS, JS), with no build step.

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Structure

- `index.html`: all sections (hero, work, services, about, contact)
- `assets/css/style.css`: styles
- `assets/js/main.js`: scroll effects (GSAP + ScrollTrigger, Lenis), gallery filter, lightbox, contact form
- `assets/img/`: optimised WebP photos and logo

## Deploy

Upload the folder as-is to GitHub Pages, Netlify or Vercel.
