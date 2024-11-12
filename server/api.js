const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

let db;
const SECRET_KEY = process.env.SECRET_KEY;

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", getFeed, authenticateToken);
  app.post("/api/feed", postTweet, authenticateToken);
  app.post("/api/login", login);
};

const getFeed = async (req, res) => {
  const query = req.query.q;
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

const postTweet = (req, res) => {
  insertDB(db, req.body.query);
  res.json({ status: "ok" });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ?`;
  const users = await queryDB(db, query, [username]);

  if (users.length === 1) {
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ token });
    } else {
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
