import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User 
} from "firebase/auth";
import { 
  ref, 
  set, 
  get, 
  update, 
  onValue, 
  onDisconnect, 
  serverTimestamp, 
  push,
  remove
} from "firebase/database";
import { auth, db } from "../firebase";
import { UserProfile, Channel, FriendDetail, UserPost, UserStory, PostComment } from "../types";

interface ChatContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  channels: Channel[];
  friends: FriendDetail[];
  pendingRequests: { friendUid: string; username: string; avatarUrl: string; type: "incoming" | "outgoing" }[];
  allUsers: UserProfile[];
  allPosts: UserPost[];
  allStories: UserStory[];
  activeChat: { type: "channel" | "dm" | "profile"; id: string; name: string; avatarUrl?: string } | null;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  
  // Auth control
  registerUser: (email: string, username: string, passwordRaw: string, avatarUrl?: string) => Promise<void>;
  loginUser: (email: string, passwordRaw: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  setActiveChat: (chat: { type: "channel" | "dm" | "profile"; id: string; name: string; avatarUrl?: string } | null) => void;
  
  // Group control
  createChannel: (name: string, description: string) => Promise<string>;
  
  // Friend control
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (friendUid: string) => Promise<void>;
  rejectFriendRequest: (friendUid: string) => Promise<void>;
  unfriendUser: (friendUid: string) => Promise<void>;
  
  // Profile settings
  updateProfileAvatar: (url: string) => Promise<void>;
  updateProfileDetails: (bio: string, isPrivate: boolean) => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
  
  // Block control
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  
  // Dynamic post & story control
  createPost: (text: string, imageUrls: string[], visibility: "global" | "friends" | "private") => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleLikePost: (postId: string) => Promise<void>;
  addCommentToPost: (postId: string, text: string) => Promise<void>;
  deleteCommentFromPost: (postId: string, commentId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  unsavePost: (postId: string) => Promise<void>;
  
  // Custom stories
  createStory: (imageUrl: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [friends, setFriends] = useState<FriendDetail[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ friendUid: string; username: string; avatarUrl: string; type: "incoming" | "outgoing" }[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allPosts, setAllPosts] = useState<UserPost[]>([]);
  const [allStories, setAllStories] = useState<UserStory[]>([]);
  const [activeChat, setActiveChatState] = useState<ChatContextType["activeChat"]>(null);
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    localStorage.setItem("aero_theme", t);
  };

  useEffect(() => {
    const saved = localStorage.getItem("aero_theme") as "light" | "dark" | null;
    if (saved) {
      setThemeState(saved);
    }
  }, []);

  const setActiveChat = (chat: ChatContextType["activeChat"]) => {
    setActiveChatState(chat);
  };

  // Auth/Presence loader
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        setActiveChatState(null);
      } else {
        const profileRef = ref(db, `users/${user.uid}`);
        
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.val() as UserProfile;
            setUserProfile(profileData);
            
            // Connected listener
            const connectedRef = ref(db, ".info/connected");
            onValue(connectedRef, (connectedSnap) => {
              if (connectedSnap.val() === true) {
                const statusRef = ref(db, `users/${user.uid}/status`);
                const lastActiveRef = ref(db, `users/${user.uid}/lastActive`);
                
                set(statusRef, "online");
                onDisconnect(statusRef).set("offline");
                onDisconnect(lastActiveRef).set(serverTimestamp());
              }
            });
          }
          setLoading(false);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch groups, stories, posts, friends in real-time
  useEffect(() => {
    if (!currentUser) return;

    // 1. Group channels
    const channelsRef = ref(db, "channels");
    const unsubChannels = onValue(channelsRef, (snapshot) => {
      const list: Channel[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          list.push({ id: child.key!, ...child.val() });
        });
      }
      list.sort((a, b) => b.createdAt - a.createdAt);
      setChannels(list);
    });

    // 2. Load all users
    const allUsersRef = ref(db, "users");
    const unsubUsers = onValue(allUsersRef, (snapshot) => {
      const list: UserProfile[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          list.push(child.val());
        });
      }
      setAllUsers(list);
    });

    // 3. Keep track of friends
    const friendsRef = ref(db, `friends/${currentUser.uid}`);
    const unsubFriends = onValue(friendsRef, async (friendsSnapshot) => {
      if (!friendsSnapshot.exists()) {
        setFriends([]);
        setPendingRequests([]);
        return;
      }

      const relations: { [uid: string]: "accepted" | "pending_sent" | "pending_received" } = {};
      friendsSnapshot.forEach((childSnap) => {
        relations[childSnap.key!] = childSnap.val();
      });

      const usersSnap = await get(ref(db, "users"));
      if (!usersSnap.exists()) return;

      const userListMap: { [uid: string]: UserProfile } = {};
      usersSnap.forEach((u) => {
        userListMap[u.key!] = u.val();
      });

      const matchedFriends: FriendDetail[] = [];
      const matchedRequests: { friendUid: string; username: string; avatarUrl: string; type: "incoming" | "outgoing" }[] = [];

      Object.entries(relations).forEach(([fUid, relStatus]) => {
        const uProfile = userListMap[fUid];
        if (!uProfile) return;

        if (relStatus === "accepted") {
          matchedFriends.push({
            ...uProfile,
            friendshipStatus: "accepted"
          });
        } else if (relStatus === "pending_sent") {
          matchedRequests.push({
            friendUid: fUid,
            username: uProfile.username,
            avatarUrl: uProfile.avatarUrl,
            type: "outgoing"
          });
        } else if (relStatus === "pending_received") {
          matchedRequests.push({
            friendUid: fUid,
            username: uProfile.username,
            avatarUrl: uProfile.avatarUrl,
            type: "incoming"
          });
        }
      });

      setFriends(matchedFriends);
      setPendingRequests(matchedRequests);
    });

    // 4. Load all Posts
    const postsRef = ref(db, "posts");
    const unsubPosts = onValue(postsRef, (snapshot) => {
      const list: UserPost[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
          const postData = childSnap.val();
          
          // Map comments map structure to list inside UserPost
          const mappedComments: { [commentId: string]: PostComment } = {};
          if (postData.comments) {
            Object.entries(postData.comments).forEach(([cId, cData]: [string, any]) => {
              mappedComments[cId] = {
                id: cId,
                ...cData
              };
            });
          }

          list.push({
            id: childSnap.key!,
            ...postData,
            comments: mappedComments
          });
        });
      }
      // Sort newest posts first
      list.sort((a, b) => b.timestamp - a.timestamp);
      setAllPosts(list);
    });

    // 5. Load all Stories
    const storiesRef = ref(db, "stories");
    const unsubStories = onValue(storiesRef, (snapshot) => {
      const list: UserStory[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
          list.push({ id: childSnap.key!, ...childSnap.val() });
        });
      }
      // Stories naturally expire or sort newest
      list.sort((a, b) => b.timestamp - a.timestamp);
      setAllStories(list);
    });

    return () => {
      unsubChannels();
      unsubUsers();
      unsubFriends();
      unsubPosts();
      unsubStories();
    };
  }, [currentUser]);

  // Auth flow implementations
  const registerUser = async (email: string, usernameRaw: string, passwordRaw: string, avatarUrl?: string) => {
    const username = usernameRaw.trim().toLowerCase();
    
    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters.");
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      throw new Error("Username can only contain letters, numbers, underscores and hyphens.");
    }

    // Check unique
    const usernameRef = ref(db, `usernames/${username}`);
    const existsSnap = await get(usernameRef);
    if (existsSnap.exists()) {
      throw new Error("Username is already taken. Please choose another.");
    }

    const res = await createUserWithEmailAndPassword(auth, email, passwordRaw);
    const user = res.user;

    const defaultAvatarUrl = avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

    const newProfile: UserProfile = {
      uid: user.uid,
      username: username,
      email: email,
      avatarUrl: defaultAvatarUrl,
      status: "online",
      lastActive: Date.now(),
      bio: "Hey there! I am using AeroChat Sandbox.",
      isPrivate: false,
      blockedUsers: {},
      savedPosts: {}
    };

    await set(ref(db, `users/${user.uid}`), newProfile);
    await set(ref(db, `usernames/${username}`), user.uid);
  };

  const loginUser = async (email: string, passwordRaw: string) => {
    await signInWithEmailAndPassword(auth, email, passwordRaw);
  };

  const logoutUser = async () => {
    if (currentUser) {
      await set(ref(db, `users/${currentUser.uid}/status`), "offline");
      await set(ref(db, `users/${currentUser.uid}/lastActive`), serverTimestamp());
    }
    await signOut(auth);
  };

  const updateProfileAvatar = async (url: string) => {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}`), { avatarUrl: url });
  };

  const updateProfileDetails = async (bio: string, isPrivate: boolean) => {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}`), { bio, isPrivate });
  };

  const updateUsername = async (newUsernameRaw: string) => {
    if (!currentUser || !userProfile) return;
    const newUsername = newUsernameRaw.trim().toLowerCase();
    
    if (newUsername === userProfile.username) return; // Unchanged

    if (newUsername.length < 3) throw new Error("Username must be at least 3 characters.");
    if (!/^[a-zA-Z0-9_\-]+$/.test(newUsername)) {
      throw new Error("Username must only contain letters, numbers, underscores or hyphens.");
    }

    const usernameRef = ref(db, `usernames/${newUsername}`);
    const existsSnap = await get(usernameRef);
    if (existsSnap.exists()) {
      throw new Error("This username is already taken.");
    }

    // Clean up old username
    await remove(ref(db, `usernames/${userProfile.username}`));
    // Save new username
    await set(ref(db, `usernames/${newUsername}`), currentUser.uid);
    await update(ref(db, `users/${currentUser.uid}`), { username: newUsername });
  };

  // Group channel creation
  const createChannel = async (name: string, description: string): Promise<string> => {
    if (!currentUser) throw new Error("Authenticated user required.");
    
    const formattedName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!formattedName) throw new Error("Channel name is required");

    const channelListRef = ref(db, "channels");
    const newChannelRef = push(channelListRef);
    
    const newChannel: Omit<Channel, "id"> = {
      name: formattedName,
      description: description.trim(),
      createdBy: currentUser.uid,
      createdAt: Date.now()
    };

    await set(newChannelRef, newChannel);
    return newChannelRef.key!;
  };

  // Friend invitations management
  const sendFriendRequest = async (usernameRaw: string) => {
    if (!currentUser) throw new Error("You must be signed in.");
    const username = usernameRaw.toLowerCase().trim();

    if (username === userProfile?.username) {
      throw new Error("You cannot add yourself as a friend.");
    }

    const usernameLookupRef = ref(db, `usernames/${username}`);
    const recipientSnap = await get(usernameLookupRef);
    if (!recipientSnap.exists()) {
      throw new Error("No user matches that username.");
    }
    const recipientUid = recipientSnap.val() as string;

    // Check blocked status
    const blockRef = ref(db, `users/${recipientUid}/blockedUsers/${currentUser.uid}`);
    const isBlockedSnapshot = await get(blockRef);
    if (isBlockedSnapshot.exists() && isBlockedSnapshot.val() === true) {
      throw new Error("This user is not accepting friend invitations currently.");
    }

    const existingRef = ref(db, `friends/${currentUser.uid}/${recipientUid}`);
    const existsSnap = await get(existingRef);
    if (existsSnap.exists()) {
      const status = existsSnap.val();
      if (status === "accepted") {
        throw new Error("You are already friends with this user.");
      } else if (status === "pending_sent") {
        throw new Error("You have already sent an invitation to this user.");
      } else if (status === "pending_received") {
        throw new Error("Check your request tray! This user already invited you.");
      }
    }

    await set(ref(db, `friends/${currentUser.uid}/${recipientUid}`), "pending_sent");
    await set(ref(db, `friends/${recipientUid}/${currentUser.uid}`), "pending_received");
  };

  const acceptFriendRequest = async (friendUid: string) => {
    if (!currentUser) return;
    await set(ref(db, `friends/${currentUser.uid}/${friendUid}`), "accepted");
    await set(ref(db, `friends/${friendUid}/${currentUser.uid}`), "accepted");
  };

  const rejectFriendRequest = async (friendUid: string) => {
    if (!currentUser) return;
    await set(ref(db, `friends/${currentUser.uid}/${friendUid}`), null);
    await set(ref(db, `friends/${friendUid}/${currentUser.uid}`), null);
  };

  const unfriendUser = async (friendUid: string) => {
    if (!currentUser) return;
    await set(ref(db, `friends/${currentUser.uid}/${friendUid}`), null);
    await set(ref(db, `friends/${friendUid}/${currentUser.uid}`), null);
  };

  // Block management
  const blockUser = async (targetUid: string) => {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}/blockedUsers`), { [targetUid]: true });
    // Remove friendships too as safety block
    await set(ref(db, `friends/${currentUser.uid}/${targetUid}`), null);
    await set(ref(db, `friends/${targetUid}/${currentUser.uid}`), null);
  };

  const unblockUser = async (targetUid: string) => {
    if (!currentUser) return;
    await set(ref(db, `users/${currentUser.uid}/blockedUsers/${targetUid}`), null);
  };

  // Posts Feed integrations
  const createPost = async (text: string, imageUrls: string[], visibility: "global" | "friends" | "private") => {
    if (!currentUser || !userProfile) return;
    
    const postObj: Omit<UserPost, "id"> = {
      userId: currentUser.uid,
      username: userProfile.username,
      userAvatarUrl: userProfile.avatarUrl,
      text: text.trim(),
      imageUrls: imageUrls,
      visibility,
      timestamp: Date.now()
    };

    const newPostRef = push(ref(db, "posts"));
    await set(newPostRef, postObj);
  };

  const deletePost = async (postId: string) => {
    await remove(ref(db, `posts/${postId}`));
  };

  const toggleLikePost = async (postId: string) => {
    if (!currentUser) return;
    const likeRef = ref(db, `posts/${postId}/likes/${currentUser.uid}`);
    const snap = await get(likeRef);
    if (snap.exists() && snap.val() === true) {
      await remove(likeRef);
    } else {
      await set(likeRef, true);
    }
  };

  const addCommentToPost = async (postId: string, text: string) => {
    if (!currentUser || !userProfile) return;
    const commentRef = push(ref(db, `posts/${postId}/comments`));
    await set(commentRef, {
      userId: currentUser.uid,
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl,
      text: text.trim(),
      timestamp: Date.now()
    });
  };

  const deleteCommentFromPost = async (postId: string, commentId: string) => {
    await remove(ref(db, `posts/${postId}/comments/${commentId}`));
  };

  const savePost = async (postId: string) => {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}/savedPosts`), { [postId]: true });
  };

  const unsavePost = async (postId: string) => {
    if (!currentUser) return;
    await set(ref(db, `users/${currentUser.uid}/savedPosts/${postId}`), null);
  };

  // Stories creations
  const createStory = async (imageUrl: string) => {
    if (!currentUser || !userProfile) return;
    const storyObj: Omit<UserStory, "id"> = {
      userId: currentUser.uid,
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl,
      imageUrl,
      timestamp: Date.now()
    };
    const newStoryRef = push(ref(db, "stories"));
    await set(newStoryRef, storyObj);
  };

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        channels,
        friends,
        pendingRequests,
        allUsers,
        allPosts,
        allStories,
        activeChat,
        theme,
        setTheme,
        registerUser,
        loginUser,
        logoutUser,
        setActiveChat,
        createChannel,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        unfriendUser,
        updateProfileAvatar,
        updateProfileDetails,
        updateUsername,
        blockUser,
        unblockUser,
        createPost,
        deletePost,
        toggleLikePost,
        addCommentToPost,
        deleteCommentFromPost,
        savePost,
        unsavePost,
        createStory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
