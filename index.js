const fs = require("fs/promises");
const path = require("path");
const { Podcast } = require("podcast");

const podcast = require("./info/podcast.json");
const tracks = require("./info/tracks.json");

const baseUrl = process.env.BASE_URL;

if (!baseUrl) {
  console.error("Missing BASE_URL");
  process.exit(128);
}

for (const key in podcast) {
  if ("string" === typeof podcast[key]) {
    podcast[key] = podcast[key].replace("$baseUrl", baseUrl);
  }
  podcast.itunesImage = podcast.imageUrl;
}

const feed = new Podcast(podcast);

for (const trackName in tracks) {
  const track = tracks[trackName];
  for (const key in track) {
    if ("string" === typeof track[key]) {
      track[key] = track[key].replace("$baseUrl", baseUrl);
    }
  }

  track.enclosure = {
    url: track.url,
    file: path.resolve("audio", trackName),
  };

  feed.addItem(track);
}

output(feed.buildXml())
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(err.errno || 1);
  });

async function output(xml) {
  const inDir = path.resolve(".", "src");
  const outDir = path.resolve(".", "dist");

  await fs.writeFile(path.resolve(outDir, "rss.xml"), xml);
  await fs.copyFile(
    path.resolve(inDir, "cover.jpg"),
    path.resolve(outDir, "cover.jpg")
  );
}
