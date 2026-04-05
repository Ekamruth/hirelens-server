const oauthClient = require("../config/oauth");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// STEP 1
exports.googleAuth = (req, res) => {
  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account consent",
    scope: SCOPES,
  });

  res.redirect(url);
};

// STEP 2
exports.googleCallback = async (req, res, next) => {
  try {
    const code = req.query.code;

    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    console.log("Tokens:", tokens);

    res.send("Authentication successful. Now call /sync-emails");
  } catch (err) {
    next(err);
  }
};