const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let teams = [];
let teamId = 1;

app.get('/api/teams', (req, res) => {
  console.log('GET /api/teams called');
  res.json({ success: true, data: teams });
});

app.post('/api/teams', (req, res) => {
  console.log('POST /api/teams called with:', req.body);
  const { name } = req.body;
  
  if (!name || name.length < 2) {
    return res.status(400).json({ message: 'Team name must be at least 2 characters' });
  }

  const newTeam = {
    id: teamId++,
    name,
    createdAt: new Date()
  };

  teams.push(newTeam);
  res.status(201).json({ success: true, data: newTeam });
});

app.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
});