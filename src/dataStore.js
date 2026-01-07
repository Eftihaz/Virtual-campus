const { v4: uuid } = require('uuid');
const { isMongoConfigured } = require('./db');

// MongoDB Models
const MenuItem = require('./models/MenuItem');
const News = require('./models/News');
const Event = require('./models/Event');
const Room = require('./models/Room');
const ThesisSlot = require('./models/ThesisSlot');

// In-memory seed data fallback
const seedData = {
  menu: [
    { id: uuid(), name: 'Veggie Wrap', price: 5.5, available: true, allergies: ['gluten'] },
    { id: uuid(), name: 'Grilled Chicken', price: 7, available: true, allergies: [] },
    { id: uuid(), name: 'Peanut-free Brownie', price: 3, available: false, allergies: [] },
  ],
  news: [
    { id: uuid(), title: 'Welcome Week', body: 'Orientation starts Monday.', category: 'general', department: 'student_affairs', likes: 3, comments: [] },
  ],
  events: [
    { id: uuid(), title: 'AI Seminar', department: 'CSE', type: 'seminar', date: '2025-12-20', description: 'Talk on ML systems.', interested: 5, shareLink: '' },
  ],
  rooms: [
    { id: uuid(), name: 'Lab 101', building: 'Engineering', status: 'Available', favoriteBy: [] },
    { id: uuid(), name: 'Room 202', building: 'Science', status: 'Occupied', favoriteBy: [] },
  ],
  thesisSlots: [
    { id: uuid(), supervisor: 'Dr. Khan', open: true, topic: 'IoT Security', status: 'open', requests: [] },
  ],
};

function toPlainObject(doc) {
  if (!doc) return null;
  if (doc.toObject) return doc.toObject();
  if (doc.toJSON) return doc.toJSON();
  return doc;
}

function filterBy(objArray, filters) {
  return objArray.filter((item) => {
    return Object.entries(filters).every(([key, val]) => {
      if (!val) return true;
      return String(item[key]).toLowerCase() === String(val).toLowerCase();
    });
  });
}

// Helper to seed MongoDB if empty
async function seedMongoDB() {
  if (!isMongoConfigured) return;
  
  const menuCount = await MenuItem.countDocuments();
  if (menuCount === 0) {
    await MenuItem.insertMany(seedData.menu.map(({ id, ...rest }) => rest));
  }
  
  const newsCount = await News.countDocuments();
  if (newsCount === 0) {
    await News.insertMany(seedData.news.map(({ id, ...rest }) => rest));
  }
  
  const eventsCount = await Event.countDocuments();
  if (eventsCount === 0) {
    await Event.insertMany(seedData.events.map(({ id, ...rest }) => rest));
  }
  
  const roomsCount = await Room.countDocuments();
  if (roomsCount === 0) {
    await Room.insertMany(seedData.rooms.map(({ id, ...rest }) => rest));
  }
  
  const thesisCount = await ThesisSlot.countDocuments();
  if (thesisCount === 0) {
    await ThesisSlot.insertMany(seedData.thesisSlots.map(({ id, ...rest }) => rest));
  }
}

// Cafeteria
async function getMenu(filters = {}) {
  if (isMongoConfigured) {
    let query = {};
    if (filters.allergy) {
      query.allergies = { $ne: filters.allergy.toLowerCase() };
    }
    const items = await MenuItem.find(query);
    return items.map(toPlainObject);
  }
  
  let data = seedData.menu;
  if (filters.allergy) {
    data = data.filter((item) => !item.allergies.includes(filters.allergy.toLowerCase()));
  }
  return data;
}

async function upsertMenuItem(item) {
  if (isMongoConfigured) {
    if (item.id || item._id) {
      const id = item.id || item._id;
      const updated = await MenuItem.findByIdAndUpdate(
        id,
        { $set: { name: item.name, price: item.price, available: item.available, allergies: item.allergies } },
        { new: true, upsert: false }
      );
      return toPlainObject(updated);
    }
    const newItem = new MenuItem(item);
    await newItem.save();
    return toPlainObject(newItem);
  }
  
  const existing = seedData.menu.find((m) => m.id === item.id);
  if (existing) {
    Object.assign(existing, item);
    return existing;
  }
  const newItem = { ...item, id: uuid() };
  seedData.menu.push(newItem);
  return newItem;
}

// News
async function getNews(filters = {}) {
  if (isMongoConfigured) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.department) query.department = filters.department;
    const items = await News.find(query).sort({ createdAt: -1 });
    return items.map(toPlainObject);
  }
  return filterBy(seedData.news, filters);
}

async function addNews(item) {
  if (isMongoConfigured) {
    const news = new News({ ...item, likes: 0, comments: [] });
    await news.save();
    return toPlainObject(news);
  }
  const news = { id: uuid(), likes: 0, comments: [], ...item };
  seedData.news.push(news);
  return news;
}

async function updateNews(id, updates) {
  if (isMongoConfigured) {
    const item = await News.findByIdAndUpdate(id, { $set: updates }, { new: true });
    return toPlainObject(item);
  }
  const item = seedData.news.find((n) => n.id === id);
  if (!item) return null;
  Object.assign(item, updates);
  return item;
}

async function deleteNews(id) {
  if (isMongoConfigured) {
    await News.findByIdAndDelete(id);
    return;
  }
  const idx = seedData.news.findIndex((n) => n.id === id);
  if (idx >= 0) seedData.news.splice(idx, 1);
}

async function likeNews(id) {
  if (isMongoConfigured) {
    const item = await News.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true });
    return toPlainObject(item);
  }
  const item = seedData.news.find((n) => n.id === id);
  if (item) item.likes += 1;
  return item;
}

async function commentNews(id, comment) {
  if (isMongoConfigured) {
    const item = await News.findByIdAndUpdate(
      id,
      { $push: { comments: { text: comment, createdAt: new Date() } } },
      { new: true }
    );
    return toPlainObject(item);
  }
  const item = seedData.news.find((n) => n.id === id);
  if (item) item.comments.push({ id: uuid(), text: comment, createdAt: new Date().toISOString() });
  return item;
}

// Events
async function getEvents(filters = {}) {
  if (isMongoConfigured) {
    const query = {};
    if (filters.department) query.department = filters.department;
    if (filters.type) query.type = filters.type;
    if (filters.date) query.date = filters.date;
    const events = await Event.find(query).sort({ date: 1 });
    return events.map(toPlainObject);
  }
  return filterBy(seedData.events, filters);
}

async function addEvent(event) {
  if (isMongoConfigured) {
    const newEvent = new Event({ ...event, interested: 0, shareLink: '' });
    await newEvent.save();
    return toPlainObject(newEvent);
  }
  const newEvent = { id: uuid(), interested: 0, shareLink: '', ...event };
  seedData.events.push(newEvent);
  return newEvent;
}

async function updateEvent(id, updates) {
  if (isMongoConfigured) {
    const event = await Event.findByIdAndUpdate(id, { $set: updates }, { new: true });
    return toPlainObject(event);
  }
  const event = seedData.events.find((e) => e.id === id);
  if (!event) return null;
  Object.assign(event, updates);
  return event;
}

async function deleteEvent(id) {
  if (isMongoConfigured) {
    await Event.findByIdAndDelete(id);
    return;
  }
  const idx = seedData.events.findIndex((e) => e.id === id);
  if (idx >= 0) seedData.events.splice(idx, 1);
}

async function markInterest(id) {
  if (isMongoConfigured) {
    const event = await Event.findByIdAndUpdate(id, { $inc: { interested: 1 } }, { new: true });
    return toPlainObject(event);
  }
  const event = seedData.events.find((e) => e.id === id);
  if (event) event.interested += 1;
  return event;
}

async function shareEvent(id) {
  if (isMongoConfigured) {
    const shareLink = `https://virtual-campus.local/events/${id}`;
    const event = await Event.findByIdAndUpdate(id, { $set: { shareLink } }, { new: true });
    return shareLink;
  }
  const event = seedData.events.find((e) => e.id === id);
  if (!event) return null;
  event.shareLink = `https://virtual-campus.local/events/${id}`;
  return event.shareLink;
}

// Rooms
async function getRooms() {
  if (isMongoConfigured) {
    const rooms = await Room.find();
    return rooms.map(toPlainObject);
  }
  return seedData.rooms;
}

async function updateRoomStatus(id, status) {
  if (isMongoConfigured) {
    const room = await Room.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    return toPlainObject(room);
  }
  const room = seedData.rooms.find((r) => r.id === id);
  if (!room) return null;
  room.status = status;
  return room;
}

async function toggleFavoriteRoom(id, userId) {
  if (isMongoConfigured) {
    const room = await Room.findById(id);
    if (!room) return null;
    const favoriteBy = room.favoriteBy || [];
    const index = favoriteBy.indexOf(userId);
    if (index > -1) {
      favoriteBy.splice(index, 1);
    } else {
      favoriteBy.push(userId);
    }
    room.favoriteBy = favoriteBy;
    await room.save();
    return toPlainObject(room);
  }
  const room = seedData.rooms.find((r) => r.id === id);
  if (!room) return null;
  const list = room.favoriteBy;
  if (list.includes(userId)) {
    room.favoriteBy = list.filter((u) => u !== userId);
  } else {
    room.favoriteBy.push(userId);
  }
  return room;
}

// Thesis
async function getThesisSlots() {
  if (isMongoConfigured) {
    const slots = await ThesisSlot.find();
    return slots.map(toPlainObject);
  }
  return seedData.thesisSlots;
}

async function toggleSlot(id, open) {
  if (isMongoConfigured) {
    const slot = await ThesisSlot.findByIdAndUpdate(
      id,
      { $set: { open, status: open ? 'open' : 'closed' } },
      { new: true }
    );
    return toPlainObject(slot);
  }
  const slot = seedData.thesisSlots.find((s) => s.id === id);
  if (!slot) return null;
  slot.open = open;
  slot.status = open ? 'open' : 'closed';
  return slot;
}

async function requestSupervision(slotId, payload) {
  if (isMongoConfigured) {
    const slot = await ThesisSlot.findById(slotId);
    if (!slot) return null;
    const request = { ...payload, status: 'pending', createdAt: new Date() };
    slot.requests.push(request);
    await slot.save();
    return request;
  }
  const slot = seedData.thesisSlots.find((s) => s.id === slotId);
  if (!slot) return null;
  const request = { id: uuid(), status: 'pending', ...payload };
  slot.requests.push(request);
  return request;
}

async function updateThesisStatus(slotId, requestId, status) {
  if (isMongoConfigured) {
    const slot = await ThesisSlot.findById(slotId);
    if (!slot) return null;
    const req = slot.requests.id(requestId);
    if (!req) return null;
    req.status = status;
    await slot.save();
    return toPlainObject(req);
  }
  const slot = seedData.thesisSlots.find((s) => s.id === slotId);
  if (!slot) return null;
  const req = slot.requests.find((r) => r.id === requestId);
  if (!req) return null;
  req.status = status;
  return req;
}

module.exports = {
  getMenu,
  upsertMenuItem,
  getNews,
  addNews,
  updateNews,
  deleteNews,
  likeNews,
  commentNews,
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  markInterest,
  shareEvent,
  getRooms,
  updateRoomStatus,
  toggleFavoriteRoom,
  getThesisSlots,
  toggleSlot,
  requestSupervision,
  updateThesisStatus,
  seedMongoDB,
};
