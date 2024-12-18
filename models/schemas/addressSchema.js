// schemas/addressSchema.js
import { Schema } from 'mongoose';

const addressSchema = new Schema({
  street: { type: String },
  postalCode: { type: String },
  city: { type: String },
  country: { type: String },
  infos: { type: String },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point', // Corrigé ici (c'était un array)
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
});

// Déplacez l'index dans le fichier User.js
// userSchema.index({ "address.coordinates": "2dsphere" });

export default addressSchema;