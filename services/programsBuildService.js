const fs = require("fs");
const JSZip = require("jszip");
const getDosboxConf = require("./getDosboxConf");
const { getProgram } = require("./programsDbService");

let emulators;
import("emulators").then((_emulatorsModule) => {
  emulators = global.emulators;
  emulators.pathPrefix = "./";
});

const buildCache = {};

async function build(programName, text) {
  // Get Turbo C bundle
  const bundleData = await new Promise((resolve, reject) => {
    fs.readFile("./public/tc_bundle.jsdos", (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });

  // Unzip it
  const zip = await JSZip.loadAsync(bundleData);

  // Add the program source file
  zip.file("PROGRAM.C", text);
  // Add conf file
  zip.file(".jsdos/dosbox.conf", getDosboxConf());

  // Zip it
  const newZip = await zip.generateAsync({ type: "uint8array" });

  // Run it to compile
  const ci = await emulators.dosDirect(newZip);
  let state = "INIT";
  let output = "";
  let resolveBuild;
  const buildPromise = new Promise((resolve, reject) => {
    resolveBuild = resolve;
  });
  // Read stdout. Detect build start and end using special comments
  ci.events().onStdout(async (message) => {
    switch (state) {
      case "INIT":
        if (message.includes("@@__BUILD_START__@@")) {
          state = "BUILD_START";
        }
        break;
      case "BUILD_START":
        if (message.includes("@@__BUILD_END__@@")) {
          state = "BUILD_END";
        } else {
          if (
            !message.toLowerCase().startsWith("c:\\>tcc program.c") &&
            !message.startsWith("Turbo C++ Version 3")
          ) {
            output += message;
          }
        }
        break;
      case "BUILD_END":
        resolveBuild();
        break;
    }
    console.log("Received:", message.trim());
  });

  // Timeout for build completion.
  // Abort build if it doesn't complete within stipulated time.
  const timeoutId = setTimeout(function () {
    resolveBuild();
  }, 60_000);

  await buildPromise;

  clearTimeout(timeoutId);

  await ci.exit();

  // If we did not detect build end, consider it as an error
  if (state !== "BUILD_END") {
    // res.status(500).json({
    //   message:
    //     "The build did not complete successully within the stipulated time",
    // });
    // return;
    throw new Error(
      "The build did not complete successully within the stipulated time"
    );
  }

  // Extract the built file (executble)
  const genZipData = await ci.persist();
  const genZip = await JSZip.loadAsync(genZipData);

  const programFile = genZip.file("PROGRAM.EXE");
  if (programFile) {
    buildCache[programName] = await programFile.async("base64");
    console.log("Got program");
    // TODO create and store/cache program bundle
  }

  return {
    output,
    isSuccess: !!programFile,
  };
};

module.exports.build = build;

module.exports.getBundle = async function (programName) {
  // Get program bundle
  const bundleData = await new Promise((resolve, reject) => {
    fs.readFile("./public/program_bundle.jsdos", (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });

  // Unzip it
  const zip = await JSZip.loadAsync(bundleData);

  console.log("programName", programName);

  if (!buildCache[programName]) {
    await build(programName, (await getProgram(programName)).text);
  }

  // Add the program executable file
  zip.file("PROGRAM.EXE", buildCache[programName], { base64: true });

  // Zip it
  const newZip = await zip.generateAsync({ type: "uint8array" });

  return newZip;
};
