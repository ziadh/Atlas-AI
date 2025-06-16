import 'server-only';

import mongoose from 'mongoose';
import {
  User,
  Chat,
  Message,
  Vote,
  Document,
  Suggestion,
  Stream,
  type IUser,
  type IChat,
  type IDBMessage,
  type IVote,
  type IDocument,
  type ISuggestion,
  type IStream,
} from './mongoose-schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  try {
    // biome-ignore lint: Forbidden non-null assertion.
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to connect to database');
  }
};

connectDB();

export async function getUser(email: string): Promise<Array<IUser>> {
  try {
    return await User.find({ email }).exec();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await User.create({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const id = generateUUID(); // Generate a unique ID
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    const newUser = await User.create({ id, email, password }); // Include the generated ID
    return [{
      id: newUser.id,
      email: newUser.email,
    }];
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await Chat.create({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await Vote.deleteMany({ chatId: id });
    await Message.deleteMany({ chatId: id });
    await Stream.deleteMany({ chatId: id });

    const result = await Chat.deleteOne({ id });
    return result.deletedCount > 0 ? { id } : undefined; // Mongoose deleteOne returns a result object, not the deleted document
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;
    let query = Chat.find({ userId: id });

    if (startingAfter) {
      const selectedChat = await Chat.findOne({ id: startingAfter }).exec();
      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }
      query = query.where('createdAt').gt(selectedChat.createdAt);
    } else if (endingBefore) {
      const selectedChat = await Chat.findOne({ id: endingBefore }).exec();
      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }
      query = query.where('createdAt').lt(selectedChat.createdAt);
    }

    const filteredChats = await query
      .sort({ createdAt: -1 })
      .limit(extendedLimit)
      .exec();

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    return await Chat.findOne({ id }).exec();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<IDBMessage>;
}) {
  try {
    return await Message.insertMany(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await Message.find({ chatId: id }).sort({ createdAt: 1 }).exec();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const existingVote = await Vote.findOne({ messageId }).exec();

    if (existingVote) {
      return await Vote.updateOne(
        { messageId, chatId },
        { isUpvoted: type === 'up' },
      ).exec();
    }
    return await Vote.create({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await Vote.find({ chatId: id }).exec();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await Document.create({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await Document.find({ id }).sort({ createdAt: 1 }).exec();
    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const selectedDocument = await Document.findOne({ id }).sort({ createdAt: -1 }).exec();
    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await Suggestion.deleteMany({
      documentId: id,
      documentCreatedAt: { $gt: timestamp },
    }).exec();

    const result = await Document.deleteMany({
      id,
      createdAt: { $gt: timestamp },
    }).exec();
    return result.deletedCount > 0 ? { id } : undefined; // Mongoose deleteMany returns a result object
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<ISuggestion>;
}) {
  try {
    return await Suggestion.insertMany(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await Suggestion.find({ documentId }).exec();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await Message.findOne({ id }).exec();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await Message.find({
      chatId,
      createdAt: { $gte: timestamp },
    }).select('_id').exec(); // Select _id for deletion

    const messageIds = messagesToDelete.map((message) => message._id); // Use _id for Mongoose documents

    if (messageIds.length > 0) {
      await Vote.deleteMany({
        chatId,
        messageId: { $in: messageIds },
      }).exec();

      return await Message.deleteMany({
        chatId,
        _id: { $in: messageIds },
      }).exec(); // Use _id for deletion
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await Chat.updateOne({ id: chatId }, { visibility }).exec();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const count = await Message.countDocuments({
      role: 'user',
      createdAt: { $gte: twentyFourHoursAgo },
      chatId: {
        $in: await Chat.find({ userId: id }).select('_id').exec() // Find chat IDs for the user
      }
    }).exec();

    return count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await Stream.create({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await Stream.find({ chatId })
      .select('id')
      .sort({ createdAt: 1 })
      .exec();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}
