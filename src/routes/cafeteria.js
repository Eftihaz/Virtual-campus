const express = require('express');
const router = express.Router();

const { getMenu, upsertMenuItem } = require('../dataStore');

router.get('/menu', async (req, res) => {
  const { allergy } = req.query;
  const menu = await getMenu({ allergy });
  res.json(menu);
});

router.post('/menu', async (req, res) => {
  const item = await upsertMenuItem(req.body);
  res.status(201).json(item);
});

router.put('/menu/:id', async (req, res) => {
  const item = await upsertMenuItem({ ...req.body, id: req.params.id });
  res.json(item);
});

module.exports = router;

