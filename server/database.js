const sqlite3 = require("sqlite3").verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const tweetsTableExists =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='tweets'";
const createTweetsTable = `CREATE TABLE tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  timestamp TEXT,
  text TEXT
)`;
const usersTableExists =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'";
const createUsersTable = `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT
)`;
const seedUsersTable = `INSERT INTO users (username, password) VALUES
  ('switzerchees', '123456'),
  ('john', '123456'),
  ('jane', '123456')
`;

const initializeDatabase = async () => {
  const db = new sqlite3.Database("./minitwitter.db");

  db.serialize(() => {
    db.get(tweetsTableExists, [], async (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        await db.run(createTweetsTable);
      }
    });
    db.get(usersTableExists, [], async (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        db.run(createUsersTable, [], (err) => {
          if (err) return console.error(err.message);
        
          const passwordHash = bcrypt.hashSync('123456', saltRounds);
          const seedUsers = [
            { username: 'switzerchees', password: passwordHash },
            { username: 'john', password: passwordHash },
            { username: 'jane', password: passwordHash },
          ];
        
          seedUsers.forEach((user) => {
            db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [user.username, user.password], (err) => {
              if (err) console.error(err.message);
            });
          });
        });        
      }
    });
  });

  return db;
};

const insertDB = (db, query) => {
  return new Promise((resolve, reject) => {
    db.run(query, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const queryDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = { initializeDatabase, queryDB, insertDB };
