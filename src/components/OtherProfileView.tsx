import React, { useState } from "react";
import { useChat } from "../context/ChatContext";
import { UserProfile, UserPost } from "../types";
import { 
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  Check, 
  Lock, 
  ShieldAlert, 
  ChevronLeft,
  EyeOff,
  UserCheck,
  X
} from "lucide-react";
import FeedPostItem from "./FeedPostItem";

interface OtherProfileViewProps {
  userId: string;
  onBack: () => void;
  onUserSelected: (uid: string) => void;
}

export default function OtherProfileView({ userId, onBack, onUserSelected }: OtherProfileViewProps) {
  const { 
    currentUser, 
    allUsers, 
    allPosts, 
    friends, 
    pendingRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    unfriendUser, 
    blockUser, 
    unblockUser,
    setActiveChat,
    theme
  } = useChat();

  const [loadingAction, setLoadingAction] = useState(false);
  const [errorText, setErrorText] = useState("");

  const isLight = theme === "light";

  const targetUser = allUsers.find(u => u.uid === userId);
  if (!targetUser) {
    return (
      <div className={`p-8 text-center text-xs font-mono italic ${
        isLight ? "text-zinc-500 bg-white" : "text-zinc-500 bg-zinc-950"
      }`}>
        User profile not found.
      </div>
    );
  }

  const isFriend = friends.some(f => f.uid === userId);
  const pendingObj = pendingRequests.find(r => r.friendUid === userId);
  
  const isBlockedByMe = currentUser && targetUser.blockedUsers ? !!targetUser.blockedUsers[currentUser.uid] : false;
  // Let's check our own blocked lists:
  const iBlockedThem = currentUser && allUsers.find(u => u.uid === currentUser.uid)?.blockedUsers?.[userId];

  // Feed posts made by this user
  const userPosts = allPosts.filter(p => p.userId === userId);

  // Filter posts based on privacy/friendship permissions
  const filteredPosts = userPosts.filter(p => {
    if (p.visibility === "private") return false; // creator only
    if (p.visibility === "friends") {
      return isFriend; // only show to friends
    }
    return true; // global public posts
  });

  const handleSendRequest = async () => {
    setLoadingAction(true);
    setErrorText("");
    try {
      await sendFriendRequest(targetUser.username);
    } catch (err: any) {
      setErrorText(err.message || "Failed to make invitation.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAcceptRequest = async () => {
    setLoadingAction(true);
    try {
      await acceptFriendRequest(targetUser.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUnfriend = async () => {
    if (confirm(`Do you want to unfriend @${targetUser.username}?`)) {
      setLoadingAction(true);
      try {
        await unfriendUser(targetUser.uid);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAction(false);
      }
    }
  };

  const handleBlockToggle = async () => {
    setLoadingAction(true);
    try {
      if (iBlockedThem) {
        await unblockUser(targetUser.uid);
      } else {
        if (confirm(`Block @${targetUser.username}? You won't see their posts or messages.`)) {
          await blockUser(targetUser.uid);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartChat = () => {
    // Navigate straight to DM tab
    setActiveChat({
      type: "dm",
      id: targetUser.uid,
      name: targetUser.username,
      avatarUrl: targetUser.avatarUrl
    });
  };

  // Check if they configured their account as private
  const hasHiddenPosts = targetUser.isPrivate && !isFriend;

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors ${
      isLight ? "bg-white text-zinc-900" : "bg-zinc-950 text-white"
    }`}>
      
      {/* Navigation Header */}
      <div className={`h-16 border-b flex items-center justify-between px-4 transition-colors ${
        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
      }`}>
        <button
          type="button"
          onClick={onBack}
          className={`py-1.5 px-3 border rounded-xl font-semibold text-xs flex items-center space-x-1.5 cursor-pointer transition-all ${
            isLight 
              ? "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800" 
              : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
          }`}
        >
          <ChevronLeft size={14} />
          <span>Back</span>
        </button>
        <span className="text-xs font-mono text-zinc-500">Member profile</span>
        <div className="w-12 h-2" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Card Header visual backdrop */}
        <div className={`relative rounded-2xl p-6 border text-center space-y-4 transition-all ${
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/60 border-zinc-850"
        }`}>
          <div className="relative w-20 h-20 mx-auto">
            <img 
              src={targetUser.avatarUrl} 
              alt={targetUser.username} 
              className={`w-20 h-20 rounded-2xl mx-auto border bg-zinc-900 object-cover ${
                isLight ? "border-zinc-205" : "border-zinc-800"
              }`} 
              referrerPolicy="no-referrer"
            />
            {targetUser.status === "online" && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className={`text-md font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>@{targetUser.username}</h2>
            <p className={`text-xs font-medium px-4 max-w-sm mx-auto italic break-all leading-relaxed ${
              isLight ? "text-zinc-600" : "text-zinc-300"
            }`}>
              {targetUser.bio || "No biography provided yet."}
            </p>
          </div>

          {/* Followers count row metrics */}
          <div className="flex justify-center items-center space-x-6 text-center select-none pt-1">
            <div>
              <p className={`text-xs font-black ${isLight ? "text-zinc-900" : "text-white"}`}>{userPosts.length}</p>
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Posts</p>
            </div>
            <div className={`w-px h-6 ${isLight ? "bg-zinc-200" : "bg-zinc-800"}`} />
            <div>
              <p className={`text-xs font-black ${isLight ? "text-zinc-900" : "text-white"}`}>{isFriend ? 1 : 0}</p>
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Contact</p>
            </div>
            <div className={`w-px h-6 ${isLight ? "bg-zinc-200" : "bg-zinc-800"}`} />
            <div>
              <p className={`text-xs font-black ${isLight ? "text-zinc-900" : "text-white"}`}>
                {targetUser.status === "online" ? "Active" : "Offline"}
              </p>
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Presence</p>
            </div>
          </div>

          {errorText && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium font-mono">
              {errorText}
            </div>
          )}

          {/* Action trigger links block */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
            {/* Friends invitation action trigger */}
            {isFriend ? (
              <button
                type="button"
                onClick={handleUnfriend}
                disabled={loadingAction}
                className="py-2.5 px-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/15 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                <UserMinus size={14} />
                <span>Unfriend</span>
              </button>
            ) : pendingObj?.type === "outgoing" ? (
              <button
                type="button"
                disabled
                className={`py-2.5 px-3 border font-bold rounded-xl flex items-center justify-center space-x-1 ${
                  isLight ? "bg-zinc-100 border-zinc-200 text-zinc-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                <span>Request Sent</span>
              </button>
            ) : pendingObj?.type === "incoming" ? (
              <button
                type="button"
                onClick={handleAcceptRequest}
                disabled={loadingAction}
                className={`py-2.5 px-3 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-105"
                }`}
              >
                <UserCheck size={14} />
                <span>Accept Invite</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendRequest}
                disabled={loadingAction}
                className={`py-2.5 px-3 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-105"
                }`}
              >
                <UserPlus size={14} />
                <span>Add Friend</span>
              </button>
            )}

            {/* Direct Message trigger */}
            <button
              type="button"
              onClick={handleStartChat}
              className={`py-2.5 px-3 border rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                isLight 
                  ? "bg-white hover:bg-zinc-50 border-zinc-205 text-zinc-800" 
                  : "bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-100"
              }`}
            >
              <MessageSquare size={14} />
              <span>Message</span>
            </button>
          </div>

          {/* Block actions */}
          <div className="pt-2 text-center select-none">
            <button
              type="button"
              onClick={handleBlockToggle}
              disabled={loadingAction}
              className={`text-[10px] font-bold uppercase tracking-widest py-1 px-3 border rounded-lg transition-colors cursor-pointer ${
                iBlockedThem 
                  ? "bg-rose-600/10 text-rose-500 border-rose-500/20 hover:bg-rose-600/15" 
                  : isLight 
                    ? "bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-black hover:bg-zinc-200" 
                    : "bg-zinc-900 border-transparent text-zinc-400 hover:text-white hover:bg-zinc-850"
              }`}
            >
              {iBlockedThem ? "Blocked (click to Unblock)" : "Block Account"}
            </button>
          </div>

        </div>

        {/* List of their posts */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-bold text-zinc-500 tracking-wider uppercase px-1 font-mono">
            Activity feed posts ({filteredPosts.length})
          </h3>

          {iBlockedThem ? (
            <div className={`text-center p-8 border rounded-2xl flex flex-col items-center justify-center ${
              isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
            }`}>
              <ShieldAlert size={28} className="text-rose-500 mb-2" />
              <p className="text-xs font-bold">You blocked this user</p>
              <p className="text-[10px] mt-1 text-zinc-500 font-mono">Unblock to browse their activities.</p>
            </div>
          ) : hasHiddenPosts ? (
            <div className={`text-center p-8 border rounded-2xl flex flex-col items-center justify-center ${
              isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
            }`}>
              <Lock size={28} className="text-zinc-500 mb-2" />
              <p className="text-xs font-bold">This Account is Private</p>
              <p className="text-[10px] mt-1 text-zinc-500 font-mono">Add them as a friend to explore active posts.</p>
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post, idx) => (
                <FeedPostItem 
                  key={`${post.id}-${idx}`} 
                  post={post} 
                  onUserClick={onUserSelected} 
                />
              ))}
            </div>
          ) : (
            <p className="text-center p-8 text-zinc-500 text-xs italic font-mono">No posts visible under permissions rules.</p>
          )}
        </div>

      </div>

    </div>
  );
}
