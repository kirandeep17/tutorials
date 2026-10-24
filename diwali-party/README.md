# 🪔 Diwali Party Planner

A small, mobile-first web app for planning a Diwali (and birthday!) party. It uses a Material You–inspired design with a Diwali theme.

- **Home**: countdown to the party, fireworks you can tap, flickering diyas, a budget ring, a spending breakdown and RSVP stats
- **Guests**: families and individuals with adult and kid counts, an RSVP status (tap to change it), phone numbers and search
- **Dishes**: veg/non-veg markers, quantity × price, how many people each dish serves compared with your expected guests, and whether it's ordered yet
- **Expenses**: decor, diyas, fireworks, gifts and more, each marked paid or due. Dish orders can also count toward your total

It's built with plain HTML, CSS and JavaScript, with no build step. Data is saved in the browser (`localStorage`). Use **Settings → Back up data** to move it to another device.

## Run it

Open `index.html`, or serve the folder:

```sh
cd diwali-party && python3 -m http.server 8000
```

It can be hosted on any static host (GitHub Pages, Netlify, Vercel). On iPhone, open it in Safari, then tap **Share → Add to Home Screen** to get a full-screen app. On Samsung Internet or Chrome, use **Add to Home screen**.
