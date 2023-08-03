const express = require("express");
const {
  getPrograms,
  createProgram,
  updateProgram,
  getProgram,
  deleteProgram,
} = require("../services/programsDbService");
const { build, getBundle } = require("../services/programsBuildService");

const router = express.Router();

function tryCatch(func) {
  return async function (req, res, next) {
    try {
      return await func(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

function checkAuth(username, password) {
  const envUsername = process.env.AUTH_USERNAME ?? "admin";
  const envPassword = process.env.AUTH_PASSWORD ?? "admin123";
  if (username != envUsername || password != envPassword) {
    return false;
  }
  return true;
}

function getCredentials(req) {
  const authorization = req.get("authorization");
  if (!authorization) {
    return null;
  }
  if (!authorization.startsWith("Basic ")) {
    return null;
  }
  let decoded;
  try {
    decoded = atob(authorization.substring("Basic ".length));
  } catch (err) {
    return null;
  }
  const parts = decoded.split(":");
  if (parts.length != 2) {
    return null;
  }
  return {
    username: parts[0],
    password: parts[1],
  }
}

function authMiddleware(req, res, next) {
  const credentials = getCredentials(req);
  if (!credentials || !checkAuth(credentials.username, credentials.password)) {
    res.status(403).json({
      message: "Bad credentials",
    });
    return;
  }
  next();
}

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.use("/api/*", authMiddleware);

router.post(
  "/api/authenticate",
  tryCatch(async (req, res) => {
    // if (!checkAuth(req.body.username, req.body.password)) {
    //   res.status(403).json({
    //     message: "Bad credentials",
    //   });
    //   return;
    // }
    res.json({
      message: "Welcome",
    });
  })
);

router.post(
  "/api/save-build",
  tryCatch(async (req, res) => {
    await updateProgram(req.body.name, { text: req.body.text });
    res.json(await build(req.body.name, req.body.text));
  })
);

router.get(
  "/bundle.jsdos",
  tryCatch(async (req, res) => {
    res.contentType("application/zip");
    res.end(await getBundle(req.query.programName));
  })
);

router.get(
  "/public-api/programs",
  tryCatch(async (req, res) => {
    res.json(await getPrograms());
  })
);

router.post(
  "/api/programs",
  tryCatch(async (req, res) => {
    res.json(await createProgram(req.body));
  })
);

router.patch(
  "/api/programs/:programName",
  tryCatch(async (req, res) => {
    res.json(await updateProgram(req.params.programName, req.body));
  })
);

router.get(
  "/api/programs/:programName",
  tryCatch(async (req, res) => {
    res.json(await getProgram(req.params.programName));
  })
);

router.delete(
  "/api/programs/:programName",
  tryCatch(async (req, res) => {
    res.json(await deleteProgram(req.params.programName));
  })
);

module.exports = router;
