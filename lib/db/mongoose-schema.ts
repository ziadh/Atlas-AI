import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IUser extends MongooseDocument {
  id: string;
  email: string;
  password?: string;
}

const userSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, maxlength: 64 },
  password: { type: String, maxlength: 64 },
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export interface IChat extends MongooseDocument {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: 'public' | 'private';
}

const chatSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  createdAt: { type: Date, required: true },
  title: { type: String, required: true },
  userId: { type: String, required: true, ref: 'User' },
  visibility: { type: String, required: true, enum: ['public', 'private'], default: 'private' },
});

export const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', chatSchema);

export interface IDBMessage extends MongooseDocument {
  id: string;
  chatId: string;
  role: string;
  parts: any; // Consider defining a more specific type if possible
  attachments: any; // Consider defining a more specific type if possible
  createdAt: Date;
}

const messageSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  chatId: { type: String, required: true, ref: 'Chat' },
  role: { type: String, required: true },
  parts: { type: Schema.Types.Mixed, required: true },
  attachments: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, required: true },
});

export const Message = mongoose.models.Message || mongoose.model<IDBMessage>('Message', messageSchema);

export interface IVote extends MongooseDocument {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}

const voteSchema: Schema = new Schema({
  chatId: { type: String, required: true, ref: 'Chat' },
  messageId: { type: String, required: true, ref: 'Message' },
  isUpvoted: { type: Boolean, required: true },
});

voteSchema.index({ chatId: 1, messageId: 1 }, { unique: true });

export const Vote = mongoose.models.Vote || mongoose.model<IVote>('Vote', voteSchema);

export interface IDocument extends MongooseDocument {
  id: string;
  createdAt: Date;
  title: string;
  content?: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  userId: string;
}

const documentSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  createdAt: { type: Date, required: true },
  title: { type: String, required: true },
  content: { type: String },
  kind: { type: String, required: true, enum: ['text', 'code', 'image', 'sheet'], default: 'text' },
  userId: { type: String, required: true, ref: 'User' },
});

documentSchema.index({ id: 1, createdAt: 1 }, { unique: true });

export const Document = mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);

export interface ISuggestion extends MongooseDocument {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
}

const suggestionSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  documentId: { type: String, required: true, ref: 'Document' },
  documentCreatedAt: { type: Date, required: true },
  originalText: { type: String, required: true },
  suggestedText: { type: String, required: true },
  description: { type: String },
  isResolved: { type: Boolean, required: true, default: false },
  userId: { type: String, required: true, ref: 'User' },
  createdAt: { type: Date, required: true },
});

suggestionSchema.index({ id: 1 }, { unique: true });

export const Suggestion = mongoose.models.Suggestion || mongoose.model<ISuggestion>('Suggestion', suggestionSchema);

export interface IStream extends MongooseDocument {
  id: string;
  chatId: string;
  createdAt: Date;
}

const streamSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  chatId: { type: String, required: true, ref: 'Chat' },
  createdAt: { type: Date, required: true },
});

streamSchema.index({ id: 1 }, { unique: true });

export const Stream = mongoose.models.Stream || mongoose.model<IStream>('Stream', streamSchema);
