const express = require('express');
const router = express.Router();

const {
  getNews,
  addNews,
  updateNews,
  deleteNews,
  likeNews,
  commentNews,
} = require('../dataStore');

router.get('/', async (req, res) => {
  const { department, category, date } = req.query;
  const items = await getNews({ department, category, date });
  res.json(items);
});

router.post('/', async (req, res) => {
  const created = await addNews(req.body);
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const updated = await updateNews(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await deleteNews(req.params.id);
  res.status(204).send();
});

router.post('/:id/like', async (req, res) => {
  const item = await likeNews(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.post('/:id/comment', async (req, res) => {
  const item = await commentNews(req.params.id, req.body.text);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

module.exports = router;

