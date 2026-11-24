# The Wonder List website

A guide to places of quality and style. Static site, built from a small set of content files.

## How it works

Everything on the site comes from four files in `content/`:

| File | What it holds |
|---|---|
| `places.json` | Every venue: name, area, verdict, review, price, perk, practical details |
| `guides.json` | Monthly edits and Wonder Lists, each with its list of places |
| `areas.json` | Neighbourhoods and their introductions |
| `site.json` | Site name, categories, occasions, Gold Card copy, Instagram and contact details |

Run the build and it writes the finished site into `docs/`:

```
node build.js
```

No packages to install; it only needs Node.

The build stops with a clear message if a guide points at a place that does not exist, or a place uses an image, area or occasion that is missing.

## What gets built

- A page for every place, guide, area, occasion and category, plus the homepage, Places, Guides, Roulette, Gold Card and a "Start here" page for the Instagram bio (`links.html`)
- `sitemap.xml`, `robots.txt` (search engines and AI search crawlers allowed) and `feed.xml`
- Structured data on every page for Google

## The feed for the app

The same content is published as plain JSON, so the app can read it and nothing is entered twice:

- `docs/api/places.json`
- `docs/api/guides.json`
- `docs/api/areas.json`
- `docs/api/site.json`

## Photos and reels

- Photos go in `assets/img/` and are referenced by file name in the content files.
- Reel videos go in `assets/video/`. Set `"video": "file-name.mp4"` on a guide and it plays in place of the still.

## Putting it live

In the repository settings, open Pages and choose branch `main`, folder `/docs`.

Page addresses in the sitemap and in the share tags use the `url` in `content/site.json`. Change it there if the site lives somewhere else.

## Before it goes public

The venue descriptions, perks and practical details are sample content, and so are three of the venues. Replace them with real, agreed content first. The footer note comes from `sampleNotice` in `content/site.json`.

The waitlist form is not connected to a mailing list yet.
