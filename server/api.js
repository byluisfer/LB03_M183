const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");
const { log } = require("console");
require("dotenv").config();

let db;
const SECRET_KEY = process.env.SECRET_KEY;
const key = Buffer.from(process.env.KEY, "utf8");
const iv = Buffer.from(process.env.IV, "utf8");

const encrypt = (text) => {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

const decrypt = (text) => {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const escapeHTML = (text) => {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
})

const logActivity = (req, res) => {
  const timestamp = new Date().toISOString();
  const user = req.user  ? req.user.username : req.body.username || "Not logged in";
  const logEntry = `${user} made ${req.method} on ${req.url} at ${timestamp}`;
  console.log(logEntry);
}

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
  app.post("/api/login", limiter, login);
};

const getFeed = async (req, res) => {
  logActivity(req, "Accessed to feed");
  const query = `SELECT * FROM tweets`;
  const tweets = await queryDB(db, query);
  const decryptedTweets = tweets.map((tweet) => ({
    ...tweet,
    text: escapeHTML(decrypt(tweet.text)),
  }));
  res.json(decryptedTweets);
};

const postTweet = (req, res) => {
  logActivity(req, "Posted a tweet");
  const { text } = req.body;
  const username = req.user.username;

  if (!text || text.trim() === "") {
    return res.status(400).json({ message: "Text in the tweet is required" });
  }

  const encryptedText = encrypt(text);
  const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, datetime('now'), ?)`;
  try {
    insertDB(db, query, [username, encryptedText]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  logActivity(req, "Try to login");
  const query = `SELECT * FROM users WHERE username = ?`;
  const users = await queryDB(db, query, [username]);

  if (users.length === 1) {
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
      logActivity(req, "Login successful");
      res.json({ token });
    } else {
      logActivity(req, "Login failed");
      res.status(401).json({ message: "Invalid password or username" });
    }
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader ? authHeader.split(" ")[1]: null;
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      res.status(401).json({ message: "Invalid token" });
      return
    }
    req.user = user
    next()
  })
}

module.exports = { initializeAPI };
