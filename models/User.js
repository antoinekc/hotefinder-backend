import { Schema, model } from 'mongoose';
import addressSchema from './schemas/addressSchema.js';

const userSchema = new Schema({
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    profileImage: { type: String, required: false, unique: true},
    token: { type: String, required: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isBan: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    inscription_date: { type: Date, default: Date.now },
    resetToken: { type: String },
    resetTokenExpiration: { type: Date },
    address: [addressSchema],
    services: {
        creation_de_lannonce: { type: Boolean, default: false },
        gestion_du_menage: { type: Boolean, default: false },
        lavage_du_linge: { type: Boolean, default: false },
        optimisation_des_prix: { type: Boolean, default: false },
        remise_des_cles: { type: Boolean, default: false },
        checkin: { type: Boolean, default: false },
        checkout: { type: Boolean, default: false },
        boite_a_cles: { type: Boolean, default: false }
    }
});

// Ajoutez l'index ici, après la définition du schéma
userSchema.index({ "address.coordinates": "2dsphere" });

export default model('User', userSchema);

