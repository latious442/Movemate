import { app } from "./app.js";
import { config, isCloudinaryConfigured } from "./config.js";

app.listen(config.port, () => {
  console.log(`MoveMate API listening on http://localhost:${config.port}`);
  console.log(`  storage driver : ${config.storageDriver}`);
  console.log(`  data file      : ${config.dataFile}`);
  console.log(`  photo storage  : ${isCloudinaryConfigured() ? "cloudinary" : "unconfigured"}`);
});
