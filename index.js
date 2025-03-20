const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

app.use(express.json())
const PORT = 3000;

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
app.post("/articles", (req, res)=>{
    let {title, content} = req.body;

    db.run(`INSERT INTO articles (title, content) VALUES (?, ?)`,
    [title, content],
    function(err) {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      res.json({id: this.lastID, title, content});
    });
});