import React, { useState, useEffect } from "react";
import { ChatProvider, useChat } from "./context/ChatContext";
import LoginForm from "./components/LoginForm";
import StoryBubble from "./components/StoryBubble";
import FeedPostItem from "./components/FeedPostItem";
import OtherProfileView from "./components/OtherProfileView";
import SettingsPanel from "./components/SettingsPanel";
import ActiveChatView from "./components/ActiveChatView";
import DMUserRow from "./components/DMUserRow";
import { uploadImageToImgBB } from "./utils/imageUpload";
import { 
  Home as HomeIcon, 
  MessageSquare, 
  PlusSquare, 
  Bell, 
  User as UserIcon, 
  Settings as SettingsIcon,
  Search, 
  LogOut, 
  UserCheck, 
  UserX, 
  UserPlus, 
  Loader2, 
  UploadCloud, 
  ShieldAlert, 
  Lock, 
  Activity, 
  Globe, 
  Users, 
  Smile, 
  Trash2, 
  Check, 
  Plus,
  Compass,
  Sparkles,
  Info
} from "lucide-react";

function ChatAppContent() {
  const { 
    currentUser, 
    userProfile, 
    loading, 
    channels, 
    friends, 
    pendingRequests, 
    allUsers, 
    allPosts, 
    createPost, 
    acceptFriendRequest, 
    rejectFriendRequest, 
    sendFriendRequest,
    activeChat, 
    setActiveChat,
    theme
  } = useChat();

  const isLight = theme === "light";

  const [activeTab, setActiveTab] = useState<"home" | "chats" | "add" | "notifications" | "profile">("chats");
  
  // Navigation stack overlays
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Search logic states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "users" | "channels">("all");

  // Create Post states
  const [postText, setPostText] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVisibility, setPostVisibility] = useState<"global" | "friends" | "private">("global");
  const [uploadingPostImg, setUploadingPostImg] = useState(false);

  // Active Chats sub-tab
  const [chatCategory, setChatCategory] = useState<"all" | "dms" | "channels">("all");

  // Profile layout filter
  const [profileGridTab, setProfileGridTab] = useState<"posts" | "saved">("posts");

  // Time ticker state on phone status bar
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center select-none transition-colors duration-300 ${
        isLight ? "bg-white text-zinc-900" : "bg-black text-zinc-100"
      }`}>
        <div className="space-y-3.5 text-center flex flex-col items-center">
          <Loader2 size={32} className={`animate-spin ${isLight ? "text-zinc-900" : "text-white"}`} />
        </div>
      </div>
    );
  }

  // Fuzzy Search Algorithm filters people or channels
  const performFuzzySearch = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { users: [], channels: [] };

    // Simply prioritize handles that start with query or contain it
    const mathUsers = allUsers.filter(u => {
      // Exclude yourself
      if (u.uid === currentUser?.uid) return false;
      
      const inUsername = u.username.toLowerCase().includes(query);
      const inBio = u.bio?.toLowerCase().includes(query) || false;
      return inUsername || inBio;
    });

    const mathChannels = channels.filter(c => {
      const inName = c.name.toLowerCase().includes(query);
      const inDesc = c.description.toLowerCase().includes(query);
      return inName || inDesc;
    });

    return { users: mathUsers, channels: mathChannels };
  };

  const searchResults = performFuzzySearch();

  // Create post image helper
  const handleAddPostImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPostImg(true);
    try {
      const url = await uploadImageToImgBB(file);
      setPostImages(prev => [...prev, url]);
    } catch (err) {
      console.error(err);
      alert("Failed to upload image file to ImgBB.");
    } finally {
      setUploadingPostImg(false);
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && postImages.length === 0) return;

    try {
      await createPost(postText, postImages, postVisibility);
      setPostText("");
      setPostImages([]);
      setPostVisibility("global");
      // Redirect to home feed screen
      setActiveTab("home");
    } catch (err) {
      console.error(err);
    }
  };

  // Direct users lookup mapping for Direct Messages list layout
  const buildDMsList = () => {
    if (!currentUser) return [];
    // Gather all users except yourself
    const otherUsers = allUsers.filter(u => u.uid !== currentUser.uid);
    
    // Fuzzy filter if query acts
    if (searchQuery.trim() && chatCategory === "dms") {
      return otherUsers.filter(u => u.username.includes(searchQuery.toLowerCase()));
    }
    return otherUsers;
  };

  const dmsList = buildDMsList();

  // Load Feed Timeline Post stream based on Friendship visibility & blocks
  const buildFeedPosts = () => {
    if (!currentUser || !userProfile) return [];

    // Get your blocked list
    const myBlocked = userProfile.blockedUsers || {};

    return allPosts.filter(post => {
      // Exclude blocked members
      if (myBlocked[post.userId]) return false;
      
      // Get target account blocked reference to you
      const targetUser = allUsers.find(u => u.uid === post.userId);
      if (targetUser?.blockedUsers?.[currentUser.uid]) return false;

      // Check visibility parameters
      if (post.userId === currentUser.uid) return true; // always show own posts

      if (post.visibility === "private") return false; // completely private to owner

      if (post.visibility === "friends") {
        // Must be in your friends array as accepted
        return friends.some(f => f.uid === post.userId);
      }

      return true; // public global posts
    });
  };

  const feedPosts = buildFeedPosts();

  // Load My Posts/Saved Posts lists in profile grid
  const myCreatedPosts = allPosts.filter(p => p.userId === currentUser?.uid);
  const mySavedPosts = allPosts.filter(p => userProfile?.savedPosts?.[p.id]);

  // Handle click profile on avatar reference
  const handleUserSelected = (uid: string) => {
    if (uid === currentUser?.uid) {
      // Switch tab to profile
      setActiveTab("profile");
      setSelectedOtherUserId(null);
    } else {
      setSelectedOtherUserId(uid);
    }
  };

  // Safe checks for unread friends notifications indicators
  const incomingFriendRequests = pendingRequests.filter(r => r.type === "incoming");

  return (
    <div className={`h-screen w-full transition-colors duration-300 font-sans flex flex-col overflow-hidden ${
      isLight ? "bg-white text-zinc-900" : "bg-black text-zinc-100"
    }`}>
      
      {/* MAIN SCREEN BOX CONTAINER AREA (FULL SCALE) */}
      <div className="flex-grow flex flex-col overflow-hidden relative h-full">
          
        {/* RENDER LOGIN IF NOT LOGGED IN */}
        {!currentUser ? (
          <LoginForm />
        ) : (
            /* ACTIVE WORKSPACE */
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              
              {/* SUB-LAYER NAVIGATION STACKS OVERLAYS */}
              {selectedOtherUserId ? (
                <OtherProfileView 
                  userId={selectedOtherUserId} 
                  onBack={() => setSelectedOtherUserId(null)} 
                  onUserSelected={handleUserSelected}
                />
              ) : activeChat ? (
                <ActiveChatView 
                  onBack={() => setActiveChat(null)} 
                  onUserSelected={handleUserSelected}
                />
              ) : showSettings ? (
                <SettingsPanel 
                  onBack={() => {
                    setShowSettings(false);
                    // refresh profile dashboard state
                  }} 
                />
              ) : (

                /* PRIMARY APP TABS STREAM */
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  
                  {/* TAB 1: HOME FEED */}
                  {activeTab === "home" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      {/* Interactive Header search brand */}
                      <div className={`h-16 px-4 border-b flex items-center justify-between shrink-0 ${
                        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
                      }`}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] uppercase tracking-wider ${
                            isLight ? "bg-black text-white" : "bg-white text-black font-mono"
                          }`}>
                            A
                          </div>
                          <span className={`text-xs font-black tracking-wider uppercase font-mono ${
                            isLight ? "text-zinc-900" : "text-white"
                          }`}>Aero Feed</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("chats");
                              setChatCategory("all");
                            }}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              isLight 
                                ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                            }`}
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4">
                        {/* Stories Row Rail on top */}
                        <div className={`select-none pb-2 pt-4 border-b ${
                          isLight ? "bg-zinc-50/50 border-zinc-100" : "bg-zinc-900/10 border-zinc-900"
                        }`}>
                          <StoryBubble />
                        </div>

                        {/* Search inline filter on feed timeline */}
                        <div className="px-4">
                          <div className="relative">
                            <Search size={14} className="absolute inset-y-0 left-3 my-auto text-zinc-500" />
                            <input
                              type="text"
                              placeholder="Search stories & public posts..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none border transition-colors ${
                                isLight 
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-905 placeholder-zinc-400 focus:border-black" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-600"
                              }`}
                            />
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-2.5 text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-250 transition-colors"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* List of filtered feed posts */}
                        <div className="px-4 pb-12 space-y-4">
                          {searchQuery.trim() ? (
                            /* Filter feed posts matching query text or username handle */
                            feedPosts.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()) || p.text.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                              feedPosts.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()) || p.text.toLowerCase().includes(searchQuery.toLowerCase())).map((post, idx) => (
                                <FeedPostItem 
                                  key={`${post.id}-${idx}`} 
                                  post={post} 
                                  onUserClick={handleUserSelected} 
                                />
                              ))
                            ) : (
                              <p className="text-center py-8 text-zinc-500 text-xs font-mono">No matching post threads found in feed query.</p>
                            )
                          ) : feedPosts.length > 0 ? (
                            feedPosts.map((post, idx) => (
                              <FeedPostItem 
                                key={`${post.id}-${idx}`} 
                                post={post} 
                                // Handle edit/update context
                                onUserClick={handleUserSelected} 
                              />
                            ))
                          ) : (
                            <div className={`text-center p-8 border rounded-2xl flex flex-col items-center justify-center select-none space-y-2 ${
                              isLight ? "bg-zinc-50 border-zinc-150 text-zinc-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                            }`}>
                              <Compass size={24} className={isLight ? "text-zinc-400" : "text-zinc-600"} />
                              <p className={`text-xs font-bold ${isLight ? "text-zinc-800" : "text-zinc-300"}`}>Feed timeline empty</p>
                              <p className="text-[10px] text-zinc-500 leading-snug">
                                Explore channels, add friends, or upload unique stories to enrich community feeds.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CHATS DIRECTORY */}
                  {activeTab === "chats" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      {/* Title Header */}
                      <div className={`h-16 px-4 border-b flex items-center justify-between shrink-0 ${
                        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
                      }`}>
                        <h2 className={`text-sm font-extrabold tracking-tight ${isLight ? "text-zinc-900" : "text-white"}`}>Discussions</h2>
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isLight ? "bg-black text-white" : "bg-white text-black"
                        }`}>
                          LIVE BROADCAST
                        </span>
                      </div>

                      {/* Main directory search fuzzy layout */}
                      <div className="p-4 space-y-3 shrink-0">
                        <div className="relative">
                          <Search size={14} className="absolute inset-y-0 left-3.5 my-auto text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Search profiles & channels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-3 py-2.5 text-xs rounded-xl focus:outline-none border transition-colors ${
                              isLight 
                                ? "bg-zinc-50 border-zinc-200 text-zinc-905 placeholder-zinc-400 focus:border-black" 
                                : "bg-zinc-900 border-zinc-850 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500"
                            }`}
                          />
                        </div>

                        {/* Category filtering tags */}
                        <div className="flex items-center space-x-1.5 text-[11px] font-bold select-none font-mono">
                          <button
                            type="button"
                            onClick={() => { setChatCategory("all"); setSearchFilter("all"); }}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                              chatCategory === "all" 
                                ? isLight 
                                  ? "bg-black border-transparent text-white" 
                                  : "bg-white border-transparent text-black"
                                : isLight
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100"
                                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => { setChatCategory("dms"); setSearchFilter("users"); }}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                              chatCategory === "dms" 
                                ? isLight 
                                  ? "bg-black border-transparent text-white" 
                                  : "bg-white border-transparent text-black"
                                : isLight
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100"
                                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            Direct
                          </button>
                          <button
                            type="button"
                            onClick={() => { setChatCategory("channels"); setSearchFilter("channels"); }}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                              chatCategory === "channels" 
                                ? isLight 
                                  ? "bg-black border-transparent text-white" 
                                  : "bg-white border-transparent text-black"
                                : isLight
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100"
                                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            Channels
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-4">
                        
                        {/* SEARCH RESULTS IF FILLING QUERY STRING */}
                        {searchQuery.trim() ? (
                          <div className="space-y-4">
                            {/* Fuzzy Match User Profiles */}
                            {(searchFilter === "all" || searchFilter === "users") && (
                              <div className="space-y-2">
                                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1 font-mono">Profile Matches</h4>
                                {searchResults.users.length > 0 ? (
                                  searchResults.users.map((u, idx) => (
                                    <button
                                      key={`${u.uid}-${idx}`}
                                      type="button"
                                      onClick={() => handleUserSelected(u.uid)}
                                      className={`w-full p-3 border rounded-xl flex items-center space-x-3 text-left transition-all cursor-pointer ${
                                        isLight 
                                          ? "bg-white border-zinc-200 hover:bg-zinc-50" 
                                          : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900"
                                      }`}
                                    >
                                      <img src={u.avatarUrl} alt={u.username} className="w-10 h-10 rounded-lg bg-zinc-800 object-cover" referrerPolicy="no-referrer" />
                                      <div className="flex-1 truncate">
                                        <div className="flex items-center space-x-1.5">
                                          <p className={`text-xs font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>@{u.username}</p>
                                          {u.isPrivate && <Lock size={10} className="text-zinc-500" title="Private Account" />}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 truncate leading-snug">{u.bio || "No biography details."}</p>
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-zinc-500 px-1 italic font-mono">No matching members found.</p>
                                )}
                              </div>
                            )}

                            {/* Fuzzy Match Public Channels */}
                            {(searchFilter === "all" || searchFilter === "channels") && (
                              <div className="space-y-2">
                                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1 font-mono">Channel Matches</h4>
                                {searchResults.channels.length > 0 ? (
                                  searchResults.channels.map((c, idx) => (
                                    <button
                                      key={`${c.id}-${idx}`}
                                      type="button"
                                      onClick={() => setActiveChat({
                                        type: "channel",
                                        id: c.id,
                                        name: c.name
                                      })}
                                      className={`w-full p-3 border rounded-xl flex items-center space-x-3 text-left transition-all cursor-pointer ${
                                        isLight 
                                          ? "bg-white border-zinc-200 hover:bg-zinc-50" 
                                          : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900"
                                      }`}
                                    >
                                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                                        isLight ? "bg-black text-white" : "bg-zinc-800 text-white"
                                      }`}>
                                        #
                                      </div>
                                      <div className="flex-1 truncate">
                                        <p className={`text-xs font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>#{c.name}</p>
                                        <p className="text-[10px] text-zinc-500 truncate leading-none">{c.description || "Public discussions."}</p>
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-zinc-500 px-1 italic font-mono">No matching channels found.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          
                          /* STATIC FOLDERS ROOT (All, DMs or Groups) */
                          <div className="space-y-4">
                            
                            {/* Render Channels block (Visible under Channels tab) */}
                            {(chatCategory === "all" || chatCategory === "channels") && (
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between px-1">
                                  <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                                    Discussion Channels ({channels.length})
                                  </h4>
                                  <button
                                    onClick={() => {
                                      const name = prompt("Enter new public room handle name:");
                                      const desc = prompt("What's this discussion portal about?");
                                      if (name) {
                                        useChat().createChannel(name, desc || "Announcements line.");
                                      }
                                    }}
                                    className={`text-[10px] font-bold hover:underline flex items-center space-x-1 ${
                                      isLight ? "text-black" : "text-zinc-300"
                                    }`}
                                  >
                                    <Plus size={10} />
                                    <span>Create Channel</span>
                                  </button>
                                </div>

                                {channels.map((c, idx) => (
                                  <button
                                    key={`${c.id}-${idx}`}
                                    type="button"
                                    onClick={() => setActiveChat({
                                      type: "channel",
                                      id: c.id,
                                      name: c.name
                                    })}
                                    className={`w-full p-4 border rounded-2xl flex items-center space-x-3 text-left transition-all cursor-pointer ${
                                      isLight 
                                        ? "bg-white/70 hover:bg-white border-zinc-200/60 shadow-xs" 
                                        : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/40"
                                    }`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-sm font-bold shadow-xs ${
                                      isLight ? "bg-black text-white" : "bg-white text-black"
                                    }`}>
                                      #
                                    </div>
                                    <div className="flex-1 truncate">
                                      <p className={`text-xs font-bold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}># {c.name}</p>
                                      <p className="text-[10px] text-zinc-500 truncate mt-1">{c.description || "Active community line."}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Render DMs block (Visible under Direct Chats tab) */}
                            {(chatCategory === "all" || chatCategory === "dms") && (
                              <div className="space-y-2.5">
                                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono px-1">
                                  Profiles Directory ({dmsList.length})
                                  </h4>

                                {dmsList.map((u, idx) => (
                                  <DMUserRow 
                                    key={`${u.uid}-${idx}`}
                                    user={u}
                                    onPfpClick={() => handleUserSelected(u.uid)}
                                    onRowClick={() => {
                                      setActiveChat({
                                        type: "dm",
                                        id: u.uid,
                                        name: u.username,
                                        avatarUrl: u.avatarUrl
                                      });
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {/* TAB 3: CREATE MEDIA POST */}
                  {activeTab === "add" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
                      {/* Interactive Header */}
                      <div className={`h-16 px-4 border-b flex items-center justify-between shrink-0 ${
                        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
                      }`}>
                        <h2 className={`text-sm font-extrabold ${isLight ? "text-zinc-900" : "text-white"}`}>Publish Thread</h2>
                        <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase">SECURE PORTAL</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        <form onSubmit={handlePublishPost} className="space-y-4 text-xs font-sans">
                          
                          {/* Caption contents textarea */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">
                              Caption text / post message
                            </label>
                            <textarea
                              rows={5}
                              placeholder="Share your thoughts, edit, react, create..."
                              required={postImages.length === 0}
                              value={postText}
                              onChange={(e) => setPostText(e.target.value)}
                              className={`w-full p-4 rounded-2xl text-xs focus:outline-none border transition-colors leading-relaxed ${
                                isLight 
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-905 placeholder-zinc-400 focus:border-black" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-550 focus:border-zinc-650"
                              }`}
                            />
                          </div>

                          {/* Visibility selectors criteria */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            isLight ? "bg-zinc-50/50 border-zinc-150" : "bg-zinc-900/45 border-zinc-850"
                          }`}>
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-2">
                              Privacy Visibility Criteria
                            </label>
                            <div className="flex space-x-1.5 pt-1 text-[11px] font-bold select-none font-mono">
                              <button
                                type="button"
                                onClick={() => setPostVisibility("global")}
                                className={`flex-1 py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                                  postVisibility === "global"
                                    ? isLight
                                      ? "bg-black border-transparent text-white"
                                      : "bg-white border-transparent text-black"
                                    : isLight
                                      ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                              >
                                <Globe size={12} />
                                <span>Global</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPostVisibility("friends")}
                                className={`flex-1 py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                                  postVisibility === "friends"
                                    ? isLight
                                      ? "bg-black border-transparent text-white"
                                      : "bg-white border-transparent text-black"
                                    : isLight
                                      ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                              >
                                <Users size={12} />
                                <span>Friends Only</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPostVisibility("private")}
                                className={`flex-1 py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                                  postVisibility === "private"
                                    ? isLight
                                      ? "bg-black border-transparent text-white"
                                      : "bg-white border-transparent text-black"
                                    : isLight
                                      ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                              >
                                <Lock size={12} />
                                <span>Private</span>
                              </button>
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-2 px-0.5 leading-snug">
                              Global broadcasts publish to the feed timeline. Restricted posts are visible to friends only.
                            </p>
                          </div>

                          {/* Multi Image Upload row layout */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            isLight ? "bg-white border-zinc-200" : "bg-zinc-900/60 border-zinc-800"
                          }`}>
                            <label className="block text-[9px] font-bold text-zinc-455 uppercase tracking-widest font-mono mb-2">
                              Attach Media Elements
                            </label>

                            <div className="flex items-center space-x-3 overflow-x-auto pb-1.5 scrollbar-none">
                              {postImages.map((imgUrl, idx) => (
                                <div key={idx} className={`relative w-16 h-16 rounded-xl border overflow-hidden shrink-0 group ${
                                  isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-700 bg-zinc-950"
                                }`}>
                                  <img src={imgUrl} alt={`Uploaded snippet ${idx}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute inset-0 bg-black/75 hover:bg-rose-600/90 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-[10px]"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}

                              {/* Trigger button */}
                              <label className={`relative w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 ${
                                isLight 
                                  ? "bg-zinc-50 border-zinc-300 hover:border-black hover:bg-zinc-100 text-zinc-600" 
                                  : "bg-zinc-950 border-zinc-800 hover:border-white hover:bg-zinc-900 text-zinc-400"
                              }`}>
                                {uploadingPostImg ? (
                                  <Loader2 size={16} className={`animate-spin ${isLight ? "text-black" : "text-white"}`} />
                                ) : (
                                  <>
                                    <Plus size={16} />
                                    <span className="text-[8px] font-bold uppercase mt-1">Photo</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingPostImg}
                                  onChange={handleAddPostImage}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={uploadingPostImg || (!postText.trim() && postImages.length === 0)}
                            className={`w-full py-3.5 font-bold rounded-2xl tracking-wide transition-all select-none cursor-pointer border ${
                              isLight 
                                ? "bg-black hover:bg-zinc-850 disabled:bg-zinc-100 border-zinc-200 disabled:text-zinc-400 text-white" 
                                : "bg-white hover:bg-zinc-150 disabled:bg-zinc-900 border-transparent disabled:text-zinc-650 text-black"
                            }`}
                          >
                            Publish Post Thread
                          </button>

                        </form>

                      </div>
                    </div>
                  )}

                  {/* TAB 4: NOTIFICATIONS & FRIEND REQUESTS HIGHLIGHT */}
                  {activeTab === "notifications" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
                      {/* Notifications Header */}
                      <div className={`h-16 px-4 border-b flex items-center justify-between shrink-0 ${
                        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
                      }`}>
                        <h2 className={`text-sm font-extrabold ${isLight ? "text-zinc-900" : "text-white"}`}>Activity Center</h2>
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isLight ? "bg-black text-white" : "bg-white text-black"
                        }`}>
                          RECORDS LIST
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {/* THE FRIEND REQUEST ACTIONS HIGHLIGHT PANEL */}
                        <div className={`p-4 border rounded-2xl space-y-3 shadow-xs relative overflow-hidden transition-all ${
                          isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/60 border-zinc-800"
                        }`}>
                          <div className="absolute top-4 right-4 flex items-center space-x-1">
                            <span className="relative flex h-2 w-2">
                              {incomingFriendRequests.length > 0 && (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </>
                              )}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase leading-none">INVITATIONS</span>
                          </div>

                          <h3 className={`text-xs font-extrabold flex items-center space-x-1.5 ${
                            isLight ? "text-zinc-900" : "text-white"
                          }`}>
                            <Users size={14} className={isLight ? "text-zinc-800" : "text-zinc-450"} />
                            <span>Friend Requests List ({incomingFriendRequests.length})</span>
                          </h3>
                          <p className="text-[10px] text-zinc-500 leading-normal">
                            Incoming approvals needed. Accept requests to enable direct chat lines.
                          </p>

                          {incomingFriendRequests.length > 0 ? (
                            <div className="space-y-2 pt-1 select-none">
                              {incomingFriendRequests.map((request, idx) => (
                                <div 
                                  key={`${request.friendUid}-${idx}`} 
                                  className={`p-3 border rounded-xl flex items-center justify-between ${
                                    isLight ? "bg-white border-zinc-150" : "bg-zinc-950 border-zinc-850"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 overflow-hidden">
                                    <img src={request.avatarUrl} alt={request.username} className="w-8 h-8 rounded-lg bg-zinc-800 object-cover" referrerPolicy="no-referrer" />
                                    <p className={`text-[11px] font-bold truncate ${isLight ? "text-zinc-900" : "text-zinc-200"}`}>@{request.username}</p>
                                  </div>
                                  <div className="flex space-x-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => rejectFriendRequest(request.friendUid)}
                                      className={`py-1 px-2 border text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                                        isLight 
                                          ? "bg-zinc-50 border-zinc-200 text-zinc-400 hover:text-rose-600 hover:border-rose-200" 
                                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-500 hover:border-rose-900/30"
                                      }`}
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => acceptFriendRequest(request.friendUid)}
                                      className={`py-1 px-2.5 text-[10px] font-black rounded-lg cursor-pointer flex items-center space-x-1 transition-colors ${
                                        isLight 
                                          ? "bg-black text-white hover:bg-zinc-850" 
                                          : "bg-white text-black hover:bg-zinc-100"
                                      }`}
                                    >
                                      <Check size={9} />
                                      <span>Accept</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-500 text-center py-4 bg-zinc-950/5 rounded-xl border border-dashed border-zinc-305/40 italic font-mono">
                              No awaiting approvals right now.
                            </p>
                          )}

                          {/* Quick Add Search Handle inline box */}
                          <div className="pt-2 select-none">
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const box = (e.target as any).targetUsername;
                                if (!box.value.trim()) return;
                                try {
                                  await sendFriendRequest(box.value);
                                  alert("Friend Request Invitation sent successfully!");
                                  box.value = "";
                                } catch (err: any) {
                                  alert(err.message || "Failed to make request.");
                                }
                              }}
                              className={`flex space-x-1.5 mt-1 border-t pt-3 ${
                                isLight ? "border-zinc-200/60" : "border-zinc-855/40"
                              }`}
                            >
                              <input
                                type="text"
                                name="targetUsername"
                                placeholder="Friend handle (e.g. usernames)..."
                                className={`flex-1 px-3 py-1.5 text-[10px] rounded-lg focus:outline-none border transition-colors ${
                                  isLight 
                                    ? "bg-white border-zinc-205 text-zinc-900 placeholder-zinc-400 focus:border-black" 
                                    : "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-550 focus:border-zinc-605"
                                }`}
                              />
                              <button
                                type="submit"
                                className={`py-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer shrink-0 transition-colors ${
                                  isLight 
                                    ? "bg-black text-white hover:bg-zinc-850" 
                                    : "bg-white text-black hover:bg-zinc-100"
                                }`}
                              >
                                Send Invitation
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Miscellaneous Notification Alerts */}
                        <div className="space-y-2.5">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                            Dialogue reactions & comments updates
                          </h4>

                          <div className={`p-4 border rounded-2xl flex items-start space-x-3 transition-colors ${
                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
                          }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isLight ? "bg-zinc-100 text-black" : "bg-zinc-850 text-white"
                            }`}>
                              <Bell size={14} />
                            </div>
                            <div>
                              <p className={`text-xs ${isLight ? "text-zinc-850" : "text-zinc-200"}`}>
                                <strong>Secure Connection</strong> established and synced.
                              </p>
                              <span className="text-[9px] text-zinc-500 mt-1 block">Real-time RTDB sockets are active.</span>
                            </div>
                          </div>

                          <div className={`p-4 border rounded-2xl flex items-start space-x-3 transition-colors ${
                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
                          }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isLight ? "bg-zinc-100 text-black" : "bg-zinc-850 text-white"
                            }`}>
                              <PlusSquare size={14} />
                            </div>
                            <div>
                              <p className={`text-xs ${isLight ? "text-zinc-850" : "text-zinc-200"}`}>
                                <strong>Visibility controls</strong> verified in profiles.
                              </p>
                              <span className="text-[9px] text-zinc-500 mt-1 block">Private users lock screens enforce security rules.</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* TAB 5: PROFILE DASHBOARD */}
                  {activeTab === "profile" && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
                      {/* Profile Header indicators */}
                      <div className={`h-16 px-4 border-b flex items-center justify-between shrink-0 ${
                        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
                      }`}>
                        <div className="flex items-center space-x-2">
                          <img src={userProfile?.avatarUrl} alt="Me" className="w-6 h-6 rounded-md object-cover" />
                          <span className={`text-xs font-extrabold tracking-tight ${isLight ? "text-zinc-900" : "text-white"}`}>@{userProfile?.username}</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setShowSettings(true)}
                          className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
                            isLight 
                              ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black" 
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                          }`}
                          title="Manage private details"
                        >
                          <SettingsIcon size={14} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Profile Header details layout matching Mockup Emma Wilson screen */}
                        <div className={`p-5 rounded-2xl border text-center space-y-3 relative overflow-hidden transition-all ${
                          isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/60 border-zinc-805"
                        }`}>
                          
                          <div className="relative w-16 h-16 mx-auto">
                            <img 
                              src={userProfile?.avatarUrl} 
                              alt="Emma Wilson styled look" 
                              className={`w-16 h-16 rounded-2xl mx-auto object-cover border ${
                                isLight ? "border-zinc-205" : "border-zinc-800"
                              }`} 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                          </div>

                          <div className="space-y-0.5 text-center">
                            <h2 className={`text-sm font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>@{userProfile?.username}</h2>
                            <p className="text-[10px] text-zinc-500 font-mono select-all truncate max-w-[280px] mx-auto">{userProfile?.email}</p>
                            <p className={`text-[11px] italic px-4 mt-2 leading-relaxed break-words ${isLight ? "text-zinc-600" : "text-zinc-300"}`}>{userProfile?.bio}</p>
                          </div>

                          {/* Followers connections stats metrics */}
                          <div className="flex items-center justify-center space-x-6 text-center select-none pt-1">
                            <div>
                              <p className={`text-xs font-black ${isLight ? "text-zinc-900" : "text-white"}`}>{myCreatedPosts.length}</p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Posts</p>
                            </div>
                            <div className={`w-px h-5 ${isLight ? "bg-zinc-200" : "bg-zinc-800"}`} />
                            <div>
                              <p className={`text-xs font-black ${isLight ? "text-zinc-900" : "text-white"}`}>{friends.length}</p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Friends</p>
                            </div>
                            <div className={`w-px h-5 ${isLight ? "bg-zinc-200" : "bg-zinc-800"}`} />
                            <div>
                              <span className={`text-[8px] font-bold font-mono uppercase tracking-wider py-0.5 px-2 rounded-md ${
                                isLight ? "bg-black text-white" : "bg-white text-black"
                              }`}>
                                {userProfile?.isPrivate ? "Locked" : "Global"}
                              </span>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mt-1 font-bold">Privacy</p>
                            </div>
                          </div>

                          {/* Settings button shortcut */}
                          <div className="pt-1.5 select-none">
                            <button
                              type="button"
                              onClick={() => setShowSettings(true)}
                              className={`w-full py-2.5 transition-all border text-[10px] font-bold rounded-xl cursor-pointer ${
                                isLight 
                                  ? "bg-white hover:bg-zinc-100 border-zinc-205 text-zinc-800" 
                                  : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-300"
                              }`}
                            >
                              Edit Profile & light/dark Theme
                            </button>
                          </div>

                        </div>

                        {/* Grid toggling row list */}
                        <div className={`flex border-b text-xs font-bold leading-normal font-mono ${
                          isLight ? "border-zinc-200" : "border-zinc-850"
                        }`}>
                          <button
                            type="button"
                            onClick={() => setProfileGridTab("posts")}
                            className={`flex-1 py-3 text-center transition-all cursor-pointer border-b-2 ${
                              profileGridTab === "posts" 
                                ? isLight 
                                  ? "text-black border-black" 
                                  : "text-white border-white bg-zinc-900/10" 
                                : `border-transparent text-zinc-500 hover:text-zinc-400`
                            }`}
                          >
                            My Posts ({myCreatedPosts.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileGridTab("saved")}
                            className={`flex-1 py-3 text-center transition-all cursor-pointer border-b-2 ${
                              profileGridTab === "saved" 
                                ? isLight 
                                  ? "text-black border-black" 
                                  : "text-white border-white bg-zinc-900/10"
                                : `border-transparent text-zinc-500 hover:text-zinc-400`
                            }`}
                          >
                            Saved ({mySavedPosts.length})
                          </button>
                        </div>

                        {/* Timeline posts listing */}
                        <div className="space-y-4 pb-12 select-none">
                          {profileGridTab === "posts" ? (
                            myCreatedPosts.length > 0 ? (
                              myCreatedPosts.map((post, idx) => (
                                <FeedPostItem 
                                  key={`${post.id}-${idx}`} 
                                  post={post} 
                                  onUserClick={handleUserSelected} 
                                />
                              ))
                            ) : (
                              <p className="text-center p-8 text-zinc-500 text-xs italic font-mono">No published threads found.</p>
                            )
                          ) : (
                            mySavedPosts.length > 0 ? (
                              mySavedPosts.map((post, idx) => (
                                <FeedPostItem 
                                  key={`${post.id}-${idx}`} 
                                  post={post} 
                                  onUserClick={handleUserSelected} 
                                />
                              ))
                            ) : (
                              <p className="text-center p-8 text-zinc-500 text-xs italic font-mono">No bookmarked saved items found.</p>
                            )
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 📲 BOTTOM DEVICE METALLIC NAVIGATION RAIL TAB CONTROL */}
              <div 
                id="phone-bottom-tabs" 
                className={`h-16 border-t flex items-center justify-around select-none shrink-0 transition-colors ${
                  isLight 
                    ? "bg-white border-zinc-200 text-zinc-500" 
                    : "bg-zinc-950 border-zinc-900 text-zinc-400"
                }`}
              >
                
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("home");
                    setSelectedOtherUserId(null);
                    setActiveChat(null);
                  }}
                  className={`flex flex-col items-center justify-center space-y-1 py-2.5 transition-colors cursor-pointer flex-1 ${
                    activeTab === "home" 
                      ? isLight ? "text-black font-bold" : "text-white font-bold" 
                      : isLight ? "hover:text-zinc-800" : "hover:text-zinc-200"
                  }`}
                >
                  <HomeIcon size={18} />
                  <span className="text-[9px] font-medium tracking-wide">Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("chats");
                    setSelectedOtherUserId(null);
                    setActiveChat(null);
                  }}
                  className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 transition-colors cursor-pointer flex-1 ${
                    activeTab === "chats" 
                      ? isLight ? "text-black font-bold" : "text-white font-bold" 
                      : isLight ? "hover:text-zinc-800" : "hover:text-zinc-200"
                  }`}
                >
                  <div className="relative">
                    <MessageSquare size={18} />
                  </div>
                  <span className="text-[9px] font-medium tracking-wide">Chats</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("add");
                    setSelectedOtherUserId(null);
                    setActiveChat(null);
                  }}
                  className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 transition-colors cursor-pointer flex-1 ${
                    activeTab === "add" 
                      ? isLight ? "text-black font-bold" : "text-white font-bold" 
                      : isLight ? "hover:text-zinc-800" : "hover:text-zinc-200"
                  }`}
                >
                  <PlusSquare size={18} />
                  <span className="text-[9px] font-medium tracking-wide font-mono">Publish</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("notifications");
                    setSelectedOtherUserId(null);
                    setActiveChat(null);
                  }}
                  className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 transition-colors cursor-pointer flex-1 ${
                    activeTab === "notifications" 
                      ? isLight ? "text-black font-bold" : "text-white font-bold" 
                      : isLight ? "hover:text-zinc-800" : "hover:text-zinc-200"
                  }`}
                >
                  <div className="relative">
                    <Bell size={18} />
                    {incomingFriendRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 text-white font-extrabold text-[7px] rounded-full flex items-center justify-center">
                        {incomingFriendRequests.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium tracking-wide">Alerts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("profile");
                    setSelectedOtherUserId(null);
                    setActiveChat(null);
                  }}
                  className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 transition-colors cursor-pointer flex-1 ${
                    activeTab === "profile" 
                      ? isLight ? "text-black font-bold" : "text-white font-bold" 
                      : isLight ? "hover:text-zinc-800" : "hover:text-zinc-200"
                  }`}
                >
                  <UserIcon size={18} />
                  <span className="text-[9px] font-medium tracking-wide">Profile</span>
                </button>

              </div>

            </div>
          )}

        </div>

      </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <ChatAppContent />
    </ChatProvider>
  );
}
