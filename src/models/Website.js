const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  sslExpiryDate: {
    type: Date
  },
  lastChecked: {
    type: Date,
    default: null
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  notificationsSent: [{
    date: Date,
    daysRemaining: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Güncelleme işlemi sırasında updatedAt'i otomatik olarak güncelle
websiteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Website', websiteSchema); 