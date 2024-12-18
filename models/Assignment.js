import { Schema, model } from 'mongoose';

const assignmentSchema = new Schema({
  property: { type: Schema.Types.ObjectId, ref: 'Property' },
  concierge: { type: Schema.Types.ObjectId, ref: 'User' },
  status: String,
  createdAt: { type: Date, default: Date.now }
});

export default model('Assignment', assignmentSchema);