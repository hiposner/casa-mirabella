# Casa Mirabella Website

Static bilingual website for Casa Mirabella in Sottoguda, Italy.

## Files

- `index.html` home page
- `apartment.html` apartment details
- `gallery.html` photo gallery with lightbox
- `explore.html` location and local guide
- `guest-info.html` guest manual / house info
- `book.html` availability and booking page
- `contact.html` contact page
- `style.css` shared design and layout
- `script.js` language toggle, mobile menu, gallery lightbox
- `availability.php` secure Booking.com iCal sync endpoint for PHP hosting
- `availability-config.php.example` example private config file for your Booking.com iCal link
- `cache/` lightweight JSON cache used by the availability sync
- `assets/` placeholder images to replace

## How to edit text

- Most text is written directly in the HTML files.
- English text uses elements with class `lang-en`.
- Italian text uses elements with class `lang-it`.
- To edit wording, open the page you want and replace the text inside those elements.
- Any text in square brackets like `[ADD-EMAIL-HERE]` or `[ADD CHECK-IN DETAILS]` should be replaced with your real information.

## How to change images

- All current images are placeholders inside the `assets/` folder.
- You can replace a placeholder file with a real image and keep the same filename.
- Or you can edit the `src="assets/..."` path in the HTML to point to a new file.
- Best homepage image to replace first: `assets/hero-placeholder.svg`

## How to change links

- Search the project for `ADD-BOOKING` or `ADD-EMAIL`.
- Replace placeholder links like `[ADD-BOOKING-COM-LINK]` with real URLs.
- Update email links like `mailto:[ADD-EMAIL-HERE]`.
- Update WhatsApp link in `contact.html` with your real number in international format.

## Language toggle

- The site starts in English by default.
- The button in the header switches between English and Italian.
- The chosen language is saved in the browser with `localStorage`.
- To change the default language, open `script.js` and change:

```js
setLanguage(getSavedLanguage() || "en");
```

Change `"en"` to `"it"` if you want Italian first.

## Live availability calendar

The booking page now supports a real synced availability calendar using your Booking.com iCal feed.

Important:

- Do not put the Booking.com `.ics` URL directly into the HTML or browser JavaScript.
- Keep it private in `availability-config.php`.
- The browser reads safe JSON from `availability.php` instead.

### Setup on GoDaddy / PHP hosting

1. Copy `availability-config.php.example` to `availability-config.php`.
2. In `availability-config.php`, paste your private Booking.com iCal URL:

```php
define('BOOKING_ICS_URL', 'https://ical.booking.com/v1/export?t=your-private-token');
```

3. Upload the full site to GoDaddy.
4. Make sure the `cache/` folder is writable by PHP on the server.

The booking page will then load availability from:

- `availability.php`

### Local testing with live sync

Because the calendar now uses PHP, `Live Server` alone is not enough for the booking page.

You need any local PHP server instead.

Simple option if PHP is installed:

1. Copy `availability-config.php.example` to `availability-config.php`
2. Put your Booking.com iCal link into that file
3. Run from the project folder:

```bash
php -S localhost:8000
```

4. Open:

```text
http://localhost:8000
```

### How the synced calendar works

- `availability.php` fetches the Booking.com iCal feed
- It parses booked/unavailable ranges
- It returns blocked dates as JSON
- `book.html` renders those dates as unavailable
- A lightweight cache file reduces repeated requests to Booking.com

### If the calendar does not load

- Check that `availability-config.php` exists
- Check that `BOOKING_ICS_URL` is set correctly in that file
- Confirm the Booking.com iCal link is still valid
- Confirm the server supports outbound HTTP requests from PHP
- Confirm the `cache/` folder is writable
- The page will show a fallback message if the feed cannot be reached

## Contact form

- The contact form is currently a visual layout only.
- To make it send messages, connect it later to:
  - a form service like Formspree
  - Netlify Forms
  - your own backend

## Publishing

You can publish this site on normal static hosting:

1. Put all files on your web host.
2. Keep the folder structure the same.
3. Make sure `index.html` stays in the root folder.
4. Upload the `assets/` folder together with the HTML, CSS, and JS files.

Easy hosting options include:

- standard cPanel hosting
- GoDaddy shared hosting with PHP
- any PHP-capable host

### Cloudflare Pages (static deployment)

This repository can be deployed as a static Cloudflare Pages project with these settings:

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `.`
- Root directory: leave blank (repository root)

`availability.php` and its private configuration example remain in the repository for a future PHP-capable deployment. Cloudflare Pages does not execute PHP, and the booking page deliberately does not request that endpoint unless a future deployment explicitly adds a `data-availability-endpoint` attribute to the calendar element.

## Notes

- The design is mobile-friendly and uses plain HTML, CSS, and JavaScript only.
- Google Fonts are loaded from the web for typography.
- If you want the site to work with no external font request, those font links can be removed later and replaced with local fonts or system fonts.
- If you regenerate your Booking.com iCal token, update the `BOOKING_ICS_URL` value in `availability-config.php`.
