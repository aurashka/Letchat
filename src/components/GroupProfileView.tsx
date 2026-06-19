import React, { useState, useEffect } from "react";
import { ref, onValue, update, get, set } from "firebase/database";
import { db } from "../firebase";
import { useChat } from "../context/ChatContext";
import { Channel, UserProfile } from "../types";
import { 
  ChevronLeft, 
  Settings, 
  Shield, 
  Users, 
  Lock, 
  Globe, 
  Edit3, 
  UserMinus, 
  UserPlus, 
  Check, 
  Camera,
  X
} from "lucide-react";
import { uploadImageToImgBB } from "../utils/imageUpload";

interface GroupProfileViewProps {
  channelId: string;
  onBack: () => void;
  onUserSelected: (uid: string) => void;
}

export default function GroupProfileView({ channelId, onBack, onUserSelected }: GroupProfileViewProps) {
  const { currentUser, userProfile, allUsers, theme } = useChat();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit states
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Invite member state
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    const channelRef = ref(db, `channels/${channelId}`);
    const unsubscribe = onValue(channelRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Fallback owner to createdBy if ownerId is missing
        const ownerId = data.ownerId || data.createdBy;
        // Make sure the owner is in the members and admins maps by default
        const updatedChannel = {
          id: channelId,
          ...data,
          ownerId,
          members: { [ownerId]: true, ...(data.members || {}) },
          admins: { [ownerId]: true, ...(data.admins || {}) }
        };
        setChannel(updatedChannel);
        setNewTitle(data.name || "");
        setNewDesc(data.description || "");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/20 backdrop-blur-md">
        <span className="w-8 h-8 rounded-full border-4 border-t-zinc-650 border-r-transparent animate-spin" />
        <p className="mt-2 text-xs text-zinc-500 font-mono">Loading Group Profile...</p>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/20 backdrop-blur-md">
        <p className="text-sm text-zinc-400 font-semibold">Group not found or deleted.</p>
        <button 
          onClick={onBack} 
          className="mt-4 px-4 py-2 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black rounded-xl text-xs font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isLight = theme === "light";
  const myUid = currentUser?.uid || "";
  
  // Access checks
  const isOwner = channel.ownerId === myUid || channel.createdBy === myUid;
  const isAdmin = isOwner || (channel.admins && !!channel.admins[myUid]);

  // Handle setting updates
  const handleUpdateField = async (field: keyof Channel, value: any) => {
    if (!isAdmin) return;
    try {
      await update(ref(db, `channels/${channelId}`), { [field]: value });
    } catch (err) {
      console.error(err);
      alert("Failed to update setting.");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImageToImgBB(file);
      await handleUpdateField("avatarUrl", url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload group group picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleInviteUser = async (userUid: string) => {
    try {
      await update(ref(db, `channels/${channelId}/members`), { [userUid]: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveUser = async (userUid: string) => {
    if (userUid === channel.ownerId) {
      alert("Cannot remove the creator/owner.");
      return;
    }
    try {
      await set(ref(db, `channels/${channelId}/members/${userUid}`), null);
      // Also remove as admin if promoted
      await set(ref(db, `channels/${channelId}/admins/${userUid}`), null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAdmin = async (userUid: string, currentIsAdmin: boolean) => {
    if (!isOwner) {
      alert("Only the Group Owner can appoint admins.");
      return;
    }
    if (userUid === channel.ownerId) return;
    try {
      await set(ref(db, `channels/${channelId}/admins/${userUid}`), currentIsAdmin ? null : true);
    } catch (err) {
      console.error(err);
    }
  };

  const currentMembersList = allUsers.filter(u => channel.members && channel.members[u.uid]);

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isLight ? "bg-zinc-50" : "bg-zinc-950"}`}>
      
      {/* Header */}
      <div className={`h-16 px-4 border-b flex items-center justify-between shrink-0 ${isLight ? "bg-white/80 border-zinc-200" : "bg-zinc-900/60 border-zinc-800/60"} backdrop-blur-md`}>
        <div className="flex items-center space-x-3">
          <button 
            type="button" 
            onClick={onBack}
            className={`p-2 rounded-xl transition-colors ${isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-650" : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400"}`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className={`text-sm font-bold ${isLight ? "text-zinc-800" : "text-zinc-100"}`}>Group Profile</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-500 font-mono">
          <span>GROUP SETTINGS</span>
          <Shield size={12} className="text-zinc-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Core Profile Badge */}
        <div className={`p-6 rounded-3xl border flex flex-col items-center text-center ${
          isLight ? "bg-white border-zinc-200/60 shadow-xs" : "bg-zinc-900/40 border-zinc-805/40"
        }`}>
          <div className="relative group/pfp mb-3">
            {channel.avatarUrl ? (
              <img 
                src={channel.avatarUrl} 
                alt={channel.name} 
                className={`w-24 h-24 rounded-2xl object-cover border shadow-lg ${
                  isLight ? "border-zinc-200" : "border-zinc-800"
                }`}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-zinc-800 flex items-center justify-center text-white text-3xl font-bold font-mono">
                #
              </div>
            )}
            
            {isAdmin && (
              <label className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover/pfp:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] cursor-pointer">
                {uploadingAvatar ? (
                  <span className="animate-spin text-sm">...</span>
                ) : (
                  <>
                    <Camera size={18} className="mb-1" />
                    <span>Change PFP</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Group Title Section */}
          <div className="w-full flex justify-center items-center space-x-2">
            {editingTitle ? (
              <div className="flex items-center space-x-1.5 w-full max-w-xs mt-1">
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full py-1.5 px-3 text-xs font-semibold rounded-xl border focus:outline-none ${isLight ? "bg-zinc-100 text-zinc-900 border-zinc-200" : "bg-zinc-950 text-white border-zinc-800"}`}
                />
                <button 
                  onClick={async () => {
                    if (newTitle.trim()) {
                      await handleUpdateField("name", newTitle.trim().toLowerCase().replace(/\s+/g, "-"));
                      setEditingTitle(false);
                    }
                  }} 
                  className={`p-2 rounded-xl text-xs font-bold ${
                    isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h3 className={`text-md font-extrabold tracking-tight ${isLight ? "text-zinc-800" : "text-zinc-150"}`}>
                  # {channel.name}
                </h3>
                {isAdmin && (
                  <button onClick={() => setEditingTitle(true)} className="text-zinc-500 hover:text-zinc-300 p-1">
                    <Edit3 size={11} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Group Description Section */}
          <div className="w-full max-w-md mt-2">
            {editingDesc ? (
              <div className="flex items-center space-x-1.5 w-full mt-1">
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={`w-full py-1.5 px-3 text-xs rounded-xl border focus:outline-none ${isLight ? "bg-zinc-100 text-zinc-900 border-zinc-200" : "bg-zinc-950 text-white border-zinc-800"}`}
                  rows={2}
                />
                <button 
                  onClick={async () => {
                    await handleUpdateField("description", newDesc.trim());
                    setEditingDesc(false);
                  }} 
                  className={`p-2 rounded-xl text-xs shrink-0 font-bold ${
                    isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 mt-1">
                <p className="text-xs text-zinc-500 leading-relaxed italic max-w-sm">
                  {channel.description || "No description configured yet."}
                </p>
                {isAdmin && (
                  <button onClick={() => setEditingDesc(true)} className="text-zinc-500 hover:text-zinc-350 p-1 shrink-0">
                    <Edit3 size={11} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Meta details */}
          <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-zinc-800/10 w-full justify-center text-xs text-zinc-500">
            <div className="flex items-center space-x-1.5">
              <Users size={14} className="text-zinc-400" />
              <span>{currentMembersList.length} Members</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] uppercase font-black ${
                isLight ? "bg-zinc-100 text-zinc-700" : "bg-zinc-800 text-zinc-300"
              }`}>
                {channel.privacy || "public"}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Access Panel (Admins Only) */}
        {isAdmin && (
          <div className={`p-5 rounded-3xl border space-y-4 ${
            isLight ? "bg-white border-zinc-205/65" : "bg-zinc-900/40 border-zinc-805/40"
          }`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? "text-zinc-550" : "text-zinc-450"}`}>
              Group Access & Messaging Security
            </h4>
            
            <div className="space-y-4">
              {/* Privacy Setting Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className={`text-xs font-bold flex items-center space-x-2 ${isLight ? "text-zinc-800" : "text-zinc-200"}`}>
                    {channel.privacy === "private" ? <Lock size={12} className="text-zinc-400" /> : <Globe size={12} className="text-zinc-400" />}
                    <span>Group Security Type</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    {channel.privacy === "private" 
                      ? "Only invited / pre-approved members can join & see thread."
                      : "Public: Anyone can view, search & join from discussions directory."}
                  </p>
                </div>

                <div className="flex space-x-1 shrink-0">
                  <button
                    onClick={() => handleUpdateField("privacy", "public")}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      channel.privacy !== "private" 
                        ? "bg-black text-white dark:bg-white dark:text-black font-black" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-750"
                    }`}
                  >
                    Public
                  </button>
                  <button
                    onClick={() => handleUpdateField("privacy", "private")}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      channel.privacy === "private" 
                        ? "bg-black text-white dark:bg-white dark:text-black font-black" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-750"
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>

              {/* Who can send messages */}
              <div className="flex items-center justify-between border-t border-zinc-850/20 pt-3.5">
                <div className="space-y-1">
                  <span className={`text-xs font-bold block ${isLight ? "text-zinc-800" : "text-zinc-200"}`}>
                    Who Can Post Messages
                  </span>
                  <p className="text-[10px] text-zinc-500">
                    Restrict dialogue streams to Admins and Creators if needed.
                  </p>
                </div>

                <div className="flex space-x-1 shrink-0">
                  <button
                    onClick={() => handleUpdateField("whoCanSend", "anyone")}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      channel.whoCanSend !== "admins_only" 
                        ? "bg-black text-white dark:bg-white dark:text-black font-black" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-750"
                    }`}
                  >
                    Anyone
                  </button>
                  <button
                    onClick={() => handleUpdateField("whoCanSend", "admins_only")}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      channel.whoCanSend === "admins_only" 
                        ? "bg-black text-white dark:bg-white dark:text-black font-black" 
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-750"
                    }`}
                  >
                    Only Admins
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Member Directory List */}
        <div className={`p-5 rounded-3xl border space-y-4.5 ${
          isLight ? "bg-white border-zinc-205/65" : "bg-zinc-900/40 border-zinc-805/40"
        }`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? "text-zinc-550" : "text-zinc-450"}`}>
              Joined Members ({currentMembersList.length})
            </h4>

            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className={`py-1.5 px-3 font-bold text-[10px] rounded-lg flex items-center space-x-1 ${
                  isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-100"
                }`}
              >
                <UserPlus size={11} />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-800/10 space-y-3">
            {currentMembersList.map((member, idx) => {
              const uIsOwner = member.uid === channel.ownerId;
              const uIsAdmin = !!(channel.admins && channel.admins[member.uid]);
              const canModifyThisUser = isAdmin && (member.uid !== myUid) && (!uIsOwner || isOwner);

              return (
                <div key={`${member.uid}-${idx}`} className="flex items-center justify-between pt-3 first:pt-0">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <img 
                      src={member.avatarUrl} 
                      alt={member.username} 
                      onClick={() => onUserSelected(member.uid)}
                      className="w-8 h-8 rounded-lg object-cover cursor-pointer select-none bg-zinc-800/20" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="truncate text-left">
                      <span 
                        onClick={() => onUserSelected(member.uid)}
                        className={`text-xs font-bold cursor-pointer hover:underline block ${isLight ? "text-zinc-800" : "text-zinc-150"}`}
                      >
                        @{member.username}
                      </span>
                      <p className="text-[9px] text-zinc-500 capitalize max-w-[150px] truncate">
                        {uIsOwner ? "👑 Creator & Owner" : uIsAdmin ? "⭐ Channel Administrator" : "Active Member"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 select-none">
                    {/* Promoting Admins (Only Owner can) */}
                    {isOwner && member.uid !== channel.ownerId && (
                      <button
                        onClick={() => handleToggleAdmin(member.uid, uIsAdmin)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors ${
                          uIsAdmin 
                            ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" 
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {uIsAdmin ? "Dismiss Admin" : "Make Admin"}
                      </button>
                    )}

                    {/* Kicking users */}
                    {canModifyThisUser && member.uid !== channel.ownerId && (
                      <button
                        onClick={() => handleRemoveUser(member.uid)}
                        className="p-1 px-1.5 hover:bg-rose-600/10 text-rose-500 rounded-md transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invite Member overlay popup */}
      {showInviteModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
          <div className={`p-5 w-full max-w-sm rounded-[24px] border ${isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-zinc-800 text-white"} shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold">Invite New Conversationist</span>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-zinc-800 text-zinc-400 rounded-lg">
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-2.5 pr-1">
              {allUsers
                .filter(u => !channel.members || !channel.members[u.uid])
                .map((u, idx) => (
                  <div key={`${u.uid}-${idx}`} className="flex items-center justify-between p-2 hover:bg-zinc-800/10 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <img src={u.avatarUrl} alt={u.username} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <span className="text-xs font-semibold text-left">@{u.username}</span>
                    </div>
                    <button
                      onClick={() => handleInviteUser(u.uid)}
                      className={`py-1 px-2.5 text-[10px] font-bold rounded-lg ${
                        isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-100"
                      }`}
                    >
                      Invite
                    </button>
                  </div>
                ))}
              {allUsers.filter(u => !channel.members || !channel.members[u.uid]).length === 0 && (
                <p className="text-[10px] text-zinc-500 text-center py-4 italic">No more members to invite.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
