import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { uploadImageToImgBB } from "../utils/imageUpload";
import { 
  ref, 
  push, 
  set, 
  query, 
  limitToLast, 
  onValue,
  remove,
  get,
  update
} from "firebase/database";
import { db } from "../firebase";
import { Message } from "../types";
import { 
  Send, 
  Image as ImageIcon, 
  Loader2, 
  ChevronLeft, 
  EyeOff, 
  ShieldAlert, 
  Activity, 
  ArrowDown, 
  MessageSquare,
  Maximize2,
  X,
  Smile,
  Edit2,
  Trash2,
  Info
} from "lucide-react";
import GroupProfileView from "./GroupProfileView";

interface ActiveChatViewProps {
  onBack: () => void;
  onUserSelected: (uid: string) => void;
}

export default function ActiveChatView({ onBack, onUserSelected }: ActiveChatViewProps) {
  const { currentUser, userProfile, activeChat, theme } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Pagination & high volume control
  const [messageLimit, setMessageLimit] = useState(35);
  const [hasMore, setHasMore] = useState(true);

  // Lightbox overlay state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Layout markers
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Dynamic Channel/Group state for settings check
  const [activeChannelObj, setActiveChannelObj] = useState<any>(null);

  // Group Profile Modal toggling
  const [showGroupProfileId, setShowGroupProfileId] = useState<string | null>(null);

  // Message Interaction States
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);

  const getChatId = () => {
    if (!activeChat || !currentUser) return "";
    if (activeChat.type === "channel") {
      return activeChat.id;
    } else {
      const sortedIds = [currentUser.uid, activeChat.id].sort();
      return `dm_${sortedIds[0]}_${sortedIds[1]}`;
    }
  };

  const chatId = getChatId();

  // Reset pagination state when chat session changes
  useEffect(() => {
    setMessageLimit(35);
    setHasMore(true);
    setMessages([]);
    setEditingMessageId(null);
    setEditInputText("");
    setActiveReactionPickerId(null);
  }, [chatId]);

  // Load active channel settings dynamically 
  useEffect(() => {
    if (activeChat?.type === "channel") {
      const channelRef = ref(db, `channels/${activeChat.id}`);
      const unsubscribe = onValue(channelRef, (snap) => {
        if (snap.exists()) {
          setActiveChannelObj({ id: activeChat.id, ...snap.val() });
        }
      });
      return () => unsubscribe();
    } else {
      setActiveChannelObj(null);
    }
  }, [activeChat]);

  // Infinite Scroll / Load Old messages sequentially on scroll-to-top detection
  useEffect(() => {
    if (!chatId || !currentUser) return;

    setMessagesLoading(true);
    const messagesRef = ref(db, `messages/${chatId}`);
    
    // Subscribe to last N messages in Firebase real-time database path
    const q = query(messagesRef, limitToLast(messageLimit));
    
    const unsubscribe = onValue(q, (snapshot) => {
      const list: Message[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
          list.push({ id: childSnap.key!, ...childSnap.val() });
        });
      }
      
      if (list.length < messageLimit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setMessages(list);
      setMessagesLoading(false);
      
      // Keep scroll anchored to bottom on initial paint or nearby Scroll
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
          if (scrollHeight - scrollTop - clientHeight < 505) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        }
      }, 50);
    }, (error) => {
      console.error("Firebase fetch error:", error);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, messageLimit, currentUser]);

  // Load older blocks when intersection sentinel becomes visible
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore || messagesLoading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setMessageLimit(prev => prev + 35);
      }
    }, { threshold: 1.0 });

    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [topSentinelRef.current, hasMore, messagesLoading]);

  // Block permission checks
  const checkBlockStatus = () => {
    if (!activeChat || activeChat.type === "channel" || !currentUser || !userProfile) {
      return { imBlocked: false, iBlockedThem: false };
    }
    const iBlockedThem = userProfile.blockedUsers ? !!userProfile.blockedUsers[activeChat.id] : false;
    return { imBlocked: false, iBlockedThem };
  };

  const { iBlockedThem } = checkBlockStatus();

  // Who can send message policy checks
  const isMsgSendingRestricted = () => {
    if (activeChat?.type === "channel" && activeChannelObj) {
      if (activeChannelObj.whoCanSend === "admins_only") {
        const isOwner = activeChannelObj.ownerId === currentUser?.uid || activeChannelObj.createdBy === currentUser?.uid;
        const isAdmin = isOwner || (activeChannelObj.admins && activeChannelObj.admins[currentUser?.uid || ""]);
        return !isAdmin; // restrict if not admin
      }
    }
    return false;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePreview = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId || !currentUser || !userProfile) return;
    if (iBlockedThem) {
      alert("You cannot send messages while this user is blocked.");
      return;
    }
    if (isMsgSendingRestricted()) {
      alert("Only admins can post messages in this channel.");
      return;
    }

    const textPayload = inputText.trim();
    if (!textPayload && !imageFile) return;

    setInputText(""); // Reset text field immediately for responsive look
    
    let uploadedImageUrl = undefined;
    if (imageFile) {
      setUploadingImage(true);
      try {
        uploadedImageUrl = await uploadImageToImgBB(imageFile);
      } catch (err) {
        console.error("ImgBB upload failed:", err);
        alert("Failed to submit image. Using text fallback.");
      } finally {
        setUploadingImage(false);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }

    try {
      const messagesRef = ref(db, `messages/${chatId}`);
      const newMessageRef = push(messagesRef);

      const messageObject: Omit<Message, "id"> = {
        senderId: currentUser.uid,
        senderUsername: userProfile.username,
        senderAvatarUrl: userProfile.avatarUrl,
        text: textPayload,
        imageUrl: uploadedImageUrl || "",
        timestamp: Date.now()
      };

      await set(newMessageRef, messageObject);
      
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      console.error("Error creating message in database:", err);
    }
  };

  // Reactions Handler
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !userProfile) return;
    try {
      const reactionRef = ref(db, `messages/${chatId}/${messageId}/reactions/${emoji}/${currentUser.uid}`);
      const snap = await get(reactionRef);
      if (snap.exists()) {
        await set(reactionRef, null); // remove reaction
      } else {
        await set(reactionRef, userProfile.username); // add reaction
      }
      setActiveReactionPickerId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Message
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditInputText(message.text);
    setActiveReactionPickerId(null);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editInputText.trim()) return;
    try {
      await update(ref(db, `messages/${chatId}/${messageId}`), {
        text: editInputText.trim(),
        edited: true
      });
      setEditingMessageId(null);
      setEditInputText("");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message handlers
  const handleDeleteForMe = async (messageId: string) => {
    if (!currentUser) return;
    try {
      await set(ref(db, `messages/${chatId}/${messageId}/deletedFor/${currentUser.uid}`), true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      await remove(ref(db, `messages/${chatId}/${messageId}`));
    } catch (err) {
      console.error(err);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeString}`;
    if (isYesterday) return `Yesterday at ${timeString}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeString}`;
  };

  if (!activeChat) return null;

  // Render Group Profile view if triggered
  if (showGroupProfileId) {
    return (
      <GroupProfileView 
        channelId={showGroupProfileId}
        onBack={() => setShowGroupProfileId(null)}
        onUserSelected={(uid) => {
          setShowGroupProfileId(null);
          onUserSelected(uid);
        }}
      />
    );
  }

  const isLight = theme === "light";
  
  // Filter messages hidden "for me"
  const visibleMessages = messages.filter(msg => {
    if (msg.deletedFor && msg.deletedFor[currentUser?.uid || ""]) {
      return false;
    }
    return true;
  });

  const isChannelAdmin = activeChannelObj && currentUser && (
    activeChannelObj.ownerId === currentUser.uid || 
    activeChannelObj.createdBy === currentUser.uid ||
    (activeChannelObj.admins && activeChannelObj.admins[currentUser.uid])
  );

  return (
    <div id="active-chat-wrapper" className={`flex-1 flex flex-col h-full overflow-hidden relative ${isLight ? "bg-white" : "bg-zinc-950"}`}>
      
      {/* Header View */}
      <div 
        id="chat-header" 
        className={`h-16 border-b flex items-center justify-between px-4 backdrop-blur-md select-none ${
          isLight ? "bg-white/80 border-zinc-200" : "bg-zinc-900/60 border-zinc-800/60"
        }`}
      >
        <div className="flex items-center space-x-3 truncate">
          <button
            type="button"
            onClick={onBack}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? "bg-zinc-150 hover:bg-zinc-200 text-zinc-800 border-zinc-205" : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800"
            }`}
            title="Go back to dashboard"
          >
            <ChevronLeft size={16} />
          </button>

          {activeChat.type === "channel" ? (
            <button
              onClick={() => setShowGroupProfileId(activeChat.id)}
              className="relative shrink-0 focus:outline-none"
              title="View Group Profile Settings"
            >
              {activeChannelObj?.avatarUrl ? (
                <img 
                  src={activeChannelObj.avatarUrl} 
                  alt={activeChat.name} 
                  className="w-10 h-10 rounded-xl bg-zinc-805 border border-zinc-700/20 shrink-0 object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white shrink-0 select-none border border-zinc-700/20 font-bold text-xs font-mono">
                  #
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => onUserSelected(activeChat.id)}
              className="relative shrink-0 focus:outline-none"
              title="View User Profile"
            >
              <img 
                src={activeChat.avatarUrl} 
                alt={activeChat.name} 
                className={`w-10 h-10 rounded-xl bg-zinc-805 shrink-0 object-cover border transition-colors ${
                  isLight ? "border-zinc-200 hover:border-black" : "border-zinc-800 hover:border-zinc-400"
                }`} 
                referrerPolicy="no-referrer"
              />
            </button>
          )}

          <div className="truncate flex-1 text-left">
            <button
              onClick={() => {
                if (activeChat.type === "channel") {
                  setShowGroupProfileId(activeChat.id);
                } else {
                  onUserSelected(activeChat.id);
                }
              }}
              className={`font-bold text-xs tracking-wide hover:underline focus:outline-none block text-left ${
                isLight ? "text-zinc-900" : "text-zinc-100"
              }`}
            >
              {activeChat.type === "channel" ? `# ${activeChat.name}` : `@${activeChat.name}`}
            </button>
            <p className="text-[10px] text-zinc-500 truncate block font-mono">
              {activeChat.type === "channel" 
                ? (activeChannelObj?.privacy === "private" ? "Private Group Stream" : "Public Discussion") 
                : "Active Chat"}
            </p>
          </div>
        </div>

        {/* Info button & pulse indicator */}
        <div className="flex items-center space-x-2">
          {activeChat.type === "channel" && (
            <button 
              onClick={() => setShowGroupProfileId(activeChat.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-250" : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800"
              }`}
              title="View group settings and member list"
            >
              <Info size={15} />
            </button>
          )}
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {iBlockedThem ? (
        /* Blocked Overlay blocker */
        <div className="flex-1 bg-zinc-950 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className={`max-w-sm border p-6 rounded-3xl space-y-3.5 shadow-xl ${
            isLight ? "bg-white border-zinc-200" : "bg-zinc-900 border-zinc-800"
          }`}>
            <ShieldAlert size={36} className="text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-200">Conversation Blocked</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              You blocked @{activeChat.name}. Unblock them in their profile space to resume conversations.
            </p>
            <button
              onClick={() => onUserSelected(activeChat.id)}
              className={`py-2.5 px-4 text-xs font-semibold rounded-xl cursor-pointer ${
                isLight ? "bg-black hover:bg-zinc-800 text-white" : "bg-white hover:bg-zinc-100 text-black"
              }`}
            >
              View Profile
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Scrollable messages container */}
          <div 
            id="messages-scroll-well"
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto px-4 py-5 space-y-4 ${isLight ? "bg-zinc-50/50" : "bg-zinc-950"}`}
          >
            {hasMore && (
              <div ref={topSentinelRef} className="h-8 flex items-center justify-center text-[9px] text-zinc-650 font-bold select-none">
                {messagesLoading ? (
                  <div className="flex items-center space-x-1.5 animate-pulse">
                    <Loader2 size={10} className={`animate-spin ${isLight ? "text-zinc-900" : "text-white"}`} />
                    <span>Syncing conversation logs...</span>
                  </div>
                ) : (
                  <span>Scroll up to load previous messages</span>
                )}
              </div>
            )}

            {visibleMessages.length > 0 ? (
              visibleMessages.map((msg, index) => {
                const isSelf = msg.senderId === currentUser?.uid;
                const showSenderHeader = index === 0 || visibleMessages[index - 1].senderId !== msg.senderId;
                
                // Reaction summary compilation 
                const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

                return (
                  <div 
                    key={`${msg.id}-${index}`} 
                    className={`flex flex-col ${isSelf ? "items-end" : "items-start"} ${showSenderHeader ? "mt-4" : "mt-1.5"}`}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => {
                      setHoveredMessageId(null);
                      setActiveReactionPickerId(null);
                    }}
                  >
                    {showSenderHeader && (
                      <div className={`flex items-center space-x-2 mb-1 text-[10px] font-bold text-zinc-500 select-none ${isSelf ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                        <button
                          onClick={() => onUserSelected(msg.senderId)}
                          className="shrink-0 focus:outline-none"
                        >
                          <img 
                            src={msg.senderAvatarUrl} 
                            alt={msg.senderUsername} 
                            className="w-5 h-5 rounded-md bg-zinc-805 object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </button>
                        <span className="text-zinc-500">@{msg.senderUsername}</span>
                        <span className="text-[8px] text-zinc-550 font-medium font-mono">{formatMessageTime(msg.timestamp)}</span>
                      </div>
                    )}

                    <div className="relative flex items-center group/bubble space-x-2 max-w-[80%]">
                      
                      {/* Left-side action triggers if custom owner */}
                      {hoveredMessageId === msg.id && !isSelf && (
                        <div className="flex items-center space-x-1 shrink-0 select-none mr-1.5">
                          {/* Reactions Trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id)}
                              className="p-1 rounded-md bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 font-bold hover:text-white border border-zinc-800/40"
                              title="Add reaction emoji"
                            >
                              <Smile size={12} />
                            </button>
                            
                            {activeReactionPickerId === msg.id && (
                              <div className="absolute bottom-6 left-0 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-2xl flex space-x-1.5 z-40 animate-in zoom-in-95 duration-100">
                                {["LIKE", "HEART", "LAUGH", "WOW", "SAD", "THANKS"].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="px-1.5 py-0.5 hover:bg-zinc-800 rounded text-[9px] font-mono font-bold text-zinc-300 hover:text-white transition-all uppercase tracking-wider"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Delete for me */}
                          <button
                            onClick={() => handleDeleteForMe(msg.id)}
                            className="p-1 rounded-md bg-zinc-900/60 hover:bg-rose-950/40 text-zinc-450 hover:text-rose-400 border border-zinc-800/40"
                            title="Delete message only for me"
                          >
                            <Trash2 size={12} />
                          </button>

                          {/* Delete for everyone (Admins/owner only) */}
                          {isChannelAdmin && (
                            <button
                              onClick={() => handleDeleteForEveryone(msg.id)}
                              className="p-1 rounded-md bg-zinc-900/60 hover:bg-rose-900/60 text-zinc-450 hover:text-rose-500 border border-zinc-850/40"
                              title="Admin: Delete message for everyone"
                            >
                              <Lock size={10} className="inline mr-0.5" />
                              <Trash2 size={11} className="inline" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Editing Message Container Block */}
                      {editingMessageId === msg.id ? (
                        <div className="flex items-center space-x-1.5 mt-1">
                          <input
                            type="text"
                            value={editInputText}
                            onChange={(e) => setEditInputText(e.target.value)}
                            className={`px-3 py-1.5 text-xs rounded-xl focus:outline-none border ${
                              isLight ? "bg-zinc-100 border-zinc-200 text-zinc-855" : "bg-zinc-900 border-zinc-800 text-white"
                            }`}
                          />
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all ${
                              isLight 
                                ? "bg-black hover:bg-zinc-850 text-white border-black" 
                                : "bg-white hover:bg-zinc-100 text-black border-white"
                            }`}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                              isLight 
                                ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-650 border-zinc-200" 
                                : "bg-zinc-800 hover:bg-zinc-750 text-zinc-400 border-zinc-700"
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div 
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed transition-all shadow-xs ${
                            isSelf 
                              ? isLight 
                                ? "bg-black border border-black text-white rounded-tr-none text-left" 
                                : "bg-white border border-white text-black rounded-tr-none text-left"
                              : isLight
                                ? "bg-zinc-200/80 border border-zinc-300 text-zinc-800 rounded-tl-none text-left"
                                : "bg-zinc-900 border border-zinc-800/60 text-zinc-100 rounded-tl-none text-left"
                          }`}
                        >
                          {msg.imageUrl && (
                            <div className="relative rounded-xl overflow-hidden border border-zinc-950/20 mb-1 max-w-sm max-h-[180px] bg-zinc-950 cursor-pointer">
                              <img 
                                src={msg.imageUrl} 
                                alt="Message attachment" 
                                className="w-full h-full object-cover max-h-[180px] rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                              <button 
                                type="button"
                                onClick={() => setLightboxUrl(msg.imageUrl || null)}
                                className="absolute bottom-1.5 right-1.5 p-1 bg-black/60 hover:bg-black text-white rounded-md cursor-pointer"
                              >
                                <Maximize2 size={10} />
                              </button>
                            </div>
                          )}

                          {msg.text && (
                            <p className="whitespace-pre-wrap break-all select-text font-sans">{msg.text}</p>
                          )}

                          {/* Appended Edited marker indicator */}
                          {msg.edited && (
                            <span className="text-[9px] text-zinc-400 opacity-60 italic block text-right mt-1.5">
                              (edited)
                            </span>
                          )}

                          {/* Render Reactions list */}
                          {hasReactions && msg.reactions && (
                            <div className="flex flex-wrap gap-1 mt-2.5 select-none pt-1 border-t border-zinc-800/20">
                              {Object.entries(msg.reactions).map(([emoji, userDict]) => {
                                const reactorCount = Object.keys(userDict).length;
                                const userReacted = userDict[currentUser?.uid || ""];
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className={`py-0.5 px-2 rounded-full text-[10px] flex items-center space-x-1.5 transition-all ${
                                      userReacted
                                        ? isLight 
                                          ? "bg-black text-white border border-black font-semibold" 
                                          : "bg-white text-black border border-white font-semibold"
                                        : "bg-zinc-950/40 text-zinc-450 border border-zinc-800/20 hover:bg-zinc-850"
                                    }`}
                                    title={Object.values(userDict).join(", ")}
                                  >
                                    <span className="text-[8px] font-mono font-bold tracking-wide">{emoji}</span>
                                    <span className="font-bold">{reactorCount}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Right-side triggers for MY messages */}
                      {hoveredMessageId === msg.id && isSelf && (
                        <div className="flex items-center space-x-1 shrink-0 select-none ml-1.5">
                          {/* Reaction bar for self */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id)}
                              className="p-1 rounded-md bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/40"
                              title="React"
                            >
                              <Smile size={12} />
                            </button>
                            {activeReactionPickerId === msg.id && (
                              <div className="absolute bottom-6 right-0 bg-zinc-950 border border-zinc-800 p-1 rounded-xl shadow-2xl flex space-x-1.5 z-40 animate-in zoom-in-95 duration-100">
                                {["LIKE", "HEART", "LAUGH", "WOW", "SAD", "THANKS"].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="px-1.5 py-0.5 hover:bg-zinc-800 rounded text-[9px] font-mono font-bold text-zinc-300 hover:text-white transition-all uppercase tracking-wider"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Edit Message Button */}
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className={`p-1 rounded-md border text-zinc-450 transition-all ${
                              isLight 
                                ? "bg-white hover:bg-zinc-100 text-zinc-650 border-zinc-205" 
                                : "bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 border-zinc-800/40 hover:text-white"
                            }`}
                            title="Edit message content"
                          >
                            <Edit2 size={12} />
                          </button>

                          {/* Delete message interface popup container */}
                          <button
                            onClick={() => {
                              const proceed = window.confirm("Do you want to delete this message for everyone? Cancel to delete only for me.");
                              if (proceed) {
                                handleDeleteForEveryone(msg.id);
                              } else {
                                handleDeleteForMe(msg.id);
                              }
                            }}
                            className="p-1 rounded-md bg-zinc-900/60 hover:bg-rose-955/40 text-zinc-455 hover:text-rose-450 border border-zinc-800/40"
                            title="Delete options"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600 select-none">
                <MessageSquare size={24} className="text-zinc-400 mb-2" />
                <p className="text-xs font-bold text-zinc-500">Conversation Hub</p>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug max-w-xs">
                  Send a message to start this discussion.
                </p>
              </div>
            )}

            <div ref={bottomRef} className="h-2" />
          </div>

          {/* Scrolling trigger anchor */}
          {visibleMessages.length > 8 && (
            <button
              type="button"
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
              className={`absolute bottom-20 right-4 p-2.5 border rounded-full transition-all cursor-pointer shadow-lg z-20 ${
                isLight ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowDown size={14} />
            </button>
          )}

          {/* Posting/Typing restricts panel */}
          {isMsgSendingRestricted() ? (
            <div className={`p-4 text-center text-xs font-bold italic select-none shrink-0 ${
              isLight ? "bg-zinc-100 text-zinc-500 border-t border-zinc-200" : "bg-zinc-900/50 text-zinc-550 border-t border-zinc-850"
            }`}>
              🚫 Only channel administrators can broadcast messages in this stream.
            </div>
          ) : (
            /* Typing dock */
            <div id="chat-input-bar" className={`p-3.5 border-t shrink-0 ${
              isLight ? "bg-white border-zinc-200" : "bg-zinc-900/90 border-zinc-850"
            }`}>
              {imagePreview && (
                <div className={`p-2 mb-2 border rounded-xl flex items-center justify-between ${
                  isLight ? "bg-zinc-100 border-zinc-200" : "bg-zinc-950/60 border-zinc-800"
                }`}>
                  <div className="flex items-center space-x-2 truncate">
                    <div className="relative w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0">
                      <img src={imagePreview} alt="Selected user media" className="w-full h-full object-cover" />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          <Loader2 size={12} className={`animate-spin ${isLight ? "text-zinc-950" : "text-white"}`} />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">Image attachment ready</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePreview}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200" : "bg-zinc-800 hover:bg-zinc-750 text-zinc-405 border-zinc-700/60"
                  }`}
                >
                  <ImageIcon size={14} />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                <input
                  type="text"
                  placeholder={
                    uploadingImage 
                      ? "Uploading image attachment..." 
                      : activeChat.type === "channel" 
                        ? "Broadcast message..." 
                        : "Write message..."
                  }
                  disabled={uploadingImage}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-0 ${
                    isLight 
                      ? "bg-zinc-100 border-zinc-205 text-zinc-900 placeholder-zinc-450 focus:border-black" 
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500"
                  }`}
                />

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !imageFile) || uploadingImage}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                    isLight 
                      ? "bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400" 
                      : "bg-white text-black hover:bg-zinc-100 disabled:bg-zinc-900 disabled:text-zinc-650"
                  }`}
                >
                  {uploadingImage ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* FULL RES ATTACHMENT LIGHTBOX */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 select-none">
          <button 
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
          <img src={lightboxUrl} alt="High resolution" className="max-h-[85vh] max-w-full object-contain rounded-xl border border-white/10" />
        </div>
      )}

    </div>
  );
}
