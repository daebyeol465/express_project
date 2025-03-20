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

app.get('/articles', (req, res) => {
    db.all(`SELECT * FROM articles`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      res.json(rows);
    });
  });

  app.get('/articles/:id', (req, res) => {
    let id = req.params.id;
  
    db.get(`SELECT * FROM articles WHERE id = ?`, [id], (err, row) => {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      if (!row) {
        return res.status(404).json({error: "데이터가 없습니다."});
      }
      res.json(row);
    });
  });
  