const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  destination: { type: String, required: true },
  destinationId: { type: String, required: true },
  duration: { type: String, required: true },
  durationDays: { type: Number, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['adventure', 'beach', 'cultural', 'luxury', 'family', 'festival']
  },
  rating: { type: String, default: '4.5/5' },
  image: { type: String, required: true },
  features: [{ type: String }],
  included: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Package', packageSchema);