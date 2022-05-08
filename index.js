const {
  statSync: stat,
  writeFileSync: write,
  copyFileSync: copy,
} = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");

const podcast_info = require("./info/podcast.json");
const tracks = require("./info/tracks.json");

const PRETTY = { prettyPrint: true };

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  console.error("Missing BASE_URL");
  process.exit(128);
}

/** @param {string} input */
function replaceInString(input) {
  return input.replaceAll("$baseUrl", baseUrl);
}

/** @param {Date | string} date */
function formatDate(date = new Date()) {
  return date instanceof Date
    ? date.toUTCString()
    : new Date(date).toUTCString();
}

/** @param {object} obj */
function populateEnvVariables(obj) {
  for (const key in obj) {
    if (typeof obj[key] === "string") obj[key] = replaceInString(obj[key]);
    else if (typeof obj[key] === "object") populateEnvVariables(obj[key]);
  }
}

populateEnvVariables(podcast_info);
populateEnvVariables(tracks);

try {
  const feed = create({
    rss: {
      "@version": "2.0",
      "@xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
      "@xmlns:atom": "http://www.w3.org/2005/Atom",
      "@xmlns:googleplay": "http://www.google.com/schemas/play-podcasts/1.0",
      channel: {
        title: podcast_info.title,
        link: podcast_info.url,
        description: podcast_info.description,
        "atom:link": {
          "@href": podcast_info.homepage,
          "@rel": "self",
          "@type": "application/rss+xml",
        },
        "itunes:owner": {
          "itunes:name": podcast_info.author,
          "itunes:email": podcast_info.authorEmail,
        },
        "itunes:author": podcast_info,
        "itunes:image": {
          "@href": podcast_info.imageUrl,
        },
        "googleplay:block": "yes",
        "itunes:block": "Yes",
        language: "en-US",
        pubDate: formatDate(),
        lastBuildDate: formatDate(),
        item: Object.entries(tracks).map(([guid, track]) => ({
          title: track.title,
          description: track.description,
          link: track.url,
          pubDate: formatDate(track.date),
          guid: { "@isPermalink": "false", "#": guid },
          enclosure: {
            "@url": track.url,
            "@length": stat(track.file).size,
            "@type": "audio/mp4",
          },
        })),
      },
    },
  });

  const inDir = path.resolve(".", "src");
  const outDir = path.resolve(".", "dist");

  write(path.resolve(outDir, "rss.xml"), feed.toString(PRETTY));
  copy(path.resolve(inDir, "cover.jpg"), path.resolve(outDir, "cover.jpg"));
  console.log(feed.toString(PRETTY));
} catch (err) {
  console.error(err);
  process.exit(err.errno || 1);
}
