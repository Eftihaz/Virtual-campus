const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const { isMongoConfigured } = require('./db');

// MongoDB Models
const MenuItem = require('./models/MenuItem');
const News = require('./models/News');
const Event = require('./models/Event');
const Room = require('./models/Room');
const ThesisSlot = require('./models/ThesisSlot');
const User = require('./models/User');

// In-memory seed data fallback
const seedData = {
  users: [], // Will be initialized with hashed password on first use
  menu: [
    { id: uuid(), name: 'Veggie Wrap', price: 5.5, available: true, allergies: ['gluten'] },
    { id: uuid(), name: 'Grilled Chicken', price: 7, available: true, allergies: [] },
    { id: uuid(), name: 'Peanut-free Brownie', price: 3, available: false, allergies: [] },
  ],
  news: [
    { id: uuid(), title: 'Welcome Week', body: 'Orientation starts Monday.', category: 'general', department: 'student_affairs', likes: 3, comments: [], likedBy: [] },
  ],
  events: [
    { id: uuid(), title: 'AI Seminar', department: 'CSE', type: 'seminar', date: '2025-12-20', description: 'Talk on ML systems.', interested: 5, shareLink: '', interestedBy: [] },
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
  
  try {
    // Seed default admin user
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const admin = new User({
        email: 'admin@campus.edu',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        department: 'Administration',
      });
      await admin.save();
      console.log('Seeded default admin user (admin@campus.edu / admin123)');
    }
    
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      await MenuItem.insertMany(seedData.menu.map(({ id, ...rest }) => rest));
      console.log('Seeded menu items');
    }
    
    const newsCount = await News.countDocuments();
    if (newsCount === 0) {
      await News.insertMany(seedData.news.map(({ id, ...rest }) => rest));
      console.log('Seeded news items');
    }
    
    const eventsCount = await Event.countDocuments();
    if (eventsCount === 0) {
      await Event.insertMany(seedData.events.map(({ id, ...rest }) => rest));
      console.log('Seeded events');
    }
    
    const roomsCount = await Room.countDocuments();
    if (roomsCount === 0) {
      await Room.insertMany(seedData.rooms.map(({ id, ...rest }) => rest));
      console.log('Seeded rooms');
    }
    
    const thesisCount = await ThesisSlot.countDocuments();
    if (thesisCount === 0) {
      await ThesisSlot.insertMany(seedData.thesisSlots.map(({ id, ...rest }) => rest));
      console.log('Seeded thesis slots');
    }
  } catch (error) {
    console.error('Error seeding MongoDB:', error.message);
  }
}

// Initialize in-memory admin user
async function initInMemoryAdmin() {
  if (isMongoConfigured || seedData.users.length > 0) return;
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  seedData.users.push({
    id: uuid(),
    email: 'admin@campus.edu',
    password: hashedPassword,
    name: 'Admin User',
    role: 'admin',
    department: 'Administration',
    studentId: '',
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// User management functions
async function findUserByEmail(email) {
  if (isMongoConfigured) {
    return await User.findOne({ email: email.toLowerCase() });
  }
  await initInMemoryAdmin();
  return seedData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

async function findUserById(id) {
  if (isMongoConfigured) {
    return await User.findById(id);
  }
  await initInMemoryAdmin();
  return seedData.users.find(u => u.id === id || u._id === id);
}

async function createUser(userData) {
  if (isMongoConfigured) {
    const user = new User(userData);
    await user.save();
    return user;
  }
  // Hash password for in-memory
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = {
    id: uuid(),
    ...userData,
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  seedData.users.push(user);
  return user;
}

async function updateUser(id, updates) {
  if (isMongoConfigured) {
    return await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).select('-password');
  }
  const user = seedData.users.find(u => u.id === id || u._id === id);
  if (!user) return null;
  Object.assign(user, updates, { updatedAt: new Date() });
  return { ...user, password: undefined };
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
    const items = await News.find(query)
      .populate('authorId', 'name email role')
      .populate('likedBy', 'name email role')
      .populate('comments.userId', 'name email role')
      .sort({ createdAt: -1 });
    return items.map(toPlainObject);
  }
  return filterBy(seedData.news, filters);
}

async function addNews(item, user = null) {
  if (isMongoConfigured) {
    const newsData = {
      ...item,
      likes: 0,
      comments: [],
      likedBy: [],
    };
    if (user) {
      newsData.authorId = user._id || user.id;
      newsData.authorName = user.name;
    }
    const news = new News(newsData);
    await news.save();
    return toPlainObject(news);
  }
  const news = { id: uuid(), likes: 0, comments: [], likedBy: [], ...item };
  if (user) {
    news.authorId = user.id;
    news.authorName = user.name;
  }
  seedData.news.push(news);
  return news;
}

async function updateNews(id, updates, user = null) {
  if (isMongoConfigured) {
    const item = await News.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('authorId', 'name email role')
      .populate('likedBy', 'name email role')
      .populate('comments.userId', 'name email role');
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

async function likeNews(id, user = null) {
  if (isMongoConfigured) {
    if (!user) {
      const item = await News.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true });
      return toPlainObject(item);
    }
    const userId = user._id || user.id;
    const news = await News.findById(id);
    if (!news) return null;
    
    const alreadyLiked = news.likedBy.some(likedId => likedId.toString() === userId.toString());
    
    if (alreadyLiked) {
      // Unlike
      news.likedBy = news.likedBy.filter(likedId => likedId.toString() !== userId.toString());
      news.likes = Math.max(0, news.likes - 1);
    } else {
      // Like
      news.likedBy.push(userId);
      news.likes = (news.likes || 0) + 1;
    }
    
    await news.save();
    const populated = await News.findById(id).populate('likedBy', 'name email role');
    return toPlainObject(populated);
  }
  const item = seedData.news.find((n) => n.id === id);
  if (item) {
    if (!item.likedBy) item.likedBy = [];
    if (user && !item.likedBy.includes(user.id)) {
      item.likedBy.push(user.id);
      item.likes = (item.likes || 0) + 1;
    } else if (!user) {
      item.likes = (item.likes || 0) + 1;
    }
  }
  return item;
}

async function commentNews(id, comment, user = null) {
  if (isMongoConfigured) {
    const commentData = {
      text: comment,
      createdAt: new Date(),
    };
    if (user) {
      commentData.userId = user._id || user.id;
      commentData.userName = user.name;
      commentData.userRole = user.role || 'student';
    }
    const item = await News.findByIdAndUpdate(
      id,
      { $push: { comments: commentData } },
      { new: true }
    ).populate('comments.userId', 'name email role');
    return toPlainObject(item);
  }
  const item = seedData.news.find((n) => n.id === id);
  if (item) {
    const commentObj = {
      id: uuid(),
      text: comment,
      createdAt: new Date().toISOString(),
    };
    if (user) {
      commentObj.userId = user.id;
      commentObj.userName = user.name;
      commentObj.userRole = user.role || 'student';
    }
    item.comments.push(commentObj);
  }
  return item;
}

// Events
async function getEvents(filters = {}) {
  if (isMongoConfigured) {
    const query = {};
    if (filters.department) query.department = filters.department;
    if (filters.type) query.type = filters.type;
    if (filters.date) query.date = filters.date;
    const events = await Event.find(query)
      .populate('authorId', 'name email role')
      .populate('interestedBy', 'name email role')
      .sort({ date: 1 });
    return events.map(toPlainObject);
  }
  return filterBy(seedData.events, filters);
}

async function addEvent(event, user = null) {
  if (isMongoConfigured) {
    const eventData = {
      ...event,
      interested: 0,
      shareLink: '',
      interestedBy: [],
    };
    if (user) {
      eventData.authorId = user._id || user.id;
      eventData.authorName = user.name;
    }
    const newEvent = new Event(eventData);
    await newEvent.save();
    return toPlainObject(newEvent);
  }
  const newEvent = { id: uuid(), interested: 0, shareLink: '', interestedBy: [], ...event };
  if (user) {
    newEvent.authorId = user.id;
    newEvent.authorName = user.name;
  }
  seedData.events.push(newEvent);
  return newEvent;
}

async function updateEvent(id, updates, user = null) {
  if (isMongoConfigured) {
    const event = await Event.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('authorId', 'name email role')
      .populate('interestedBy', 'name email role');
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

async function markInterest(id, user = null) {
  if (isMongoConfigured) {
    if (!user) {
      const event = await Event.findByIdAndUpdate(id, { $inc: { interested: 1 } }, { new: true });
      return toPlainObject(event);
    }
    const userId = user._id || user.id;
    const event = await Event.findById(id);
    if (!event) return null;
    
    const alreadyInterested = event.interestedBy.some(intId => intId.toString() === userId.toString());
    
    if (alreadyInterested) {
      // Remove interest
      event.interestedBy = event.interestedBy.filter(intId => intId.toString() !== userId.toString());
      event.interested = Math.max(0, event.interested - 1);
    } else {
      // Add interest
      event.interestedBy.push(userId);
      event.interested = (event.interested || 0) + 1;
    }
    
    await event.save();
    const populated = await Event.findById(id).populate('interestedBy', 'name email role');
    return toPlainObject(populated);
  }
  const event = seedData.events.find((e) => e.id === id);
  if (event) {
    if (!event.interestedBy) event.interestedBy = [];
    if (user && !event.interestedBy.includes(user.id)) {
      event.interestedBy.push(user.id);
      event.interested = (event.interested || 0) + 1;
    } else if (!user) {
      event.interested = (event.interested || 0) + 1;
    }
  }
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
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
};
