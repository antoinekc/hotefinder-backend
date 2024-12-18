import { faker } from '@faker-js/faker';
import User from '../models/User.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import uid2 from 'uid2';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hotefinder');

async function generateUsers(count) {
 try {
   const users = [];
   
   for(let i = 0; i < count; i++) {
     const password = await bcrypt.hash(faker.internet.password(), 10);
     const user = new User({
       firstName: faker.person.firstName(),
       lastName: faker.person.lastName(),
       email: faker.internet.email(),
       password: password,
       token: uid2(32),
       address: [{
         street: faker.location.streetAddress(),
         zip_code: faker.location.zipCode(),
         city: faker.location.city(),
         country: faker.location.country()
       }],
       services: [{
         creation_de_lannonce: faker.datatype.boolean(),
         gestion_du_menage: faker.datatype.boolean(),
         lavage_du_linge: faker.datatype.boolean(),
         optimisation_des_prix: faker.datatype.boolean(),
         remise_des_cles: faker.datatype.boolean(),
         checkin: faker.datatype.boolean(),
         checkout: faker.datatype.boolean(),
         boite_a_cles: faker.datatype.boolean()
       }]
     });
     users.push(user);
   }

   await User.insertMany(users);
   console.log(`${count} users created!`);
   mongoose.connection.close();
 } catch(error) {
   console.error('Error:', error);
   mongoose.connection.close();
 }
}

// Generate 10 users
generateUsers(10);