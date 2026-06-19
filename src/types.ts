export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatarUrl: string;
  status: "online" | "offline" | "away";
  lastActive: number;
  bio?: string;
  isPrivate?: boolean; // privacy setting toggled
  blockedUsers?: { [uid: string]: boolean }; // blocked lists
  savedPosts?: { [postId: string]: boolean }; // saved post references
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  ownerId?: string;
  admins?: { [uid: string]: boolean };
  avatarUrl?: string;
  privacy?: "public" | "private";
  whoCanSend?: "anyone" | "admins_only";
  members?: { [uid: string]: boolean };
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
  reactions?: { [emoji: string]: { [userId: string]: string } }; // emoji -> { uid: username }
  edited?: boolean;
  deletedFor?: { [userId: string]: boolean }; // hides message for specific user IDs
  deletedForEveryone?: boolean;
}

export interface FriendRelation {
  uid: string;
  status: "accepted" | "sent" | "received";
  updatedAt: number;
}

export interface FriendDetail extends UserProfile {
  friendshipStatus: "accepted" | "sent" | "received";
}

export interface UserStory {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  imageUrl: string;
  timestamp: number;
}

export interface PostComment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: number;
}

export interface UserPost {
  id: string;
  userId: string;
  username: string;
  userAvatarUrl: string;
  text: string;
  imageUrls: string[]; // support multiple images in one post
  visibility: "global" | "friends" | "private"; // visibility criteria
  timestamp: number;
  likes?: { [userId: string]: boolean };
  comments?: { [commentId: string]: PostComment };
}
