import React, { useState, useEffect } from "react";
import { ref, query, limitToLast, onValue } from "firebase/database";
import { db } from "../firebase";
import { UserProfile, Message } from "../types";
import { useChat } from "../context/ChatContext";

export interface DMUserRowProps {
  user: UserProfile;
  onPfpClick: () => void;
  onRowClick: () => void;
}

const DMUserRow: React.FC<DMUserRowProps> = ({ user, onPfpClick, onRowClick }) => {
  const { currentUser, theme } = useChat();
  const [lastMsg, setLastMsg] = useState<Message | null>(null);

  const getChatId = () => {
    if (!currentUser || !user) return "";
    const sortedIds = [currentUser.uid, user.uid].sort();
    return `dm_${sortedIds[0]}_${sortedIds[1]}`;
  };

  const chatId = getChatId();

  useEffect(() => {
    if (!chatId) return;
    const msgQuery = query(ref(db, `messages/${chatId}`), limitToLast(1));
    const unsubscribe = onValue(msgQuery, (snapshot) => {
      if (snapshot.exists()) {
        let foundMsg: Message | null = null;
        snapshot.forEach((child) => {
          foundMsg = { id: child.key!, ...child.val() };
        });
        setLastMsg(foundMsg);
      } else {
        setLastMsg(null);
      }
    });
    return () => unsubscribe();
  }, [chatId]);

  // Format last active time Telegram-style
  const formatLastActive = () => {
    if (user.status === "online") return "online";
    if (!user.lastActive) return "offline";
    const seconds = Math.floor((Date.now() - user.lastActive) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(user.lastActive).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isLight = theme === "light";

  return (
    <div
      onClick={onRowClick}
      className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
        isLight
          ? "bg-white/70 hover:bg-white border-zinc-200/60 shadow-xs"
          : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/40"
      }`}
    >
      <div className="flex items-center space-x-3 overflow-hidden flex-1">
        {/* Cover Avatar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onPfpClick();
          }}
          className="relative shrink-0 group/avatar cursor-pointer"
          title="View Profile"
        >
          <img
            src={user.avatarUrl}
            alt={user.username}
            className={`w-11 h-11 rounded-xl bg-zinc-805 object-cover border transition-all ${
              isLight 
                ? "border-zinc-200/80 group-hover/avatar:border-black" 
                : "border-zinc-700/20 group-hover/avatar:border-zinc-300"
            }`}
            referrerPolicy="no-referrer"
          />
          {user.status === "online" && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
          )}
        </div>

        <div className="truncate flex-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? "text-zinc-850 animate-pulse-once" : "text-zinc-100"}`}>
              @{user.username}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono text-right">
              {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
            </span>
          </div>

          {/* Last chat message */}
          <p className="text-[11px] text-zinc-450 truncate mt-1 text-left">
            {lastMsg ? (
              lastMsg.imageUrl ? "📷 Photo" : lastMsg.text
            ) : (
              <span className="italic text-zinc-550 text-xs">No messages yet</span>
            )}
          </p>

          {/* Last active status display */}
          <div className="flex items-center mt-1 space-x-1">
            <span className={`text-[9px] font-semibold uppercase ${user.status === "online" ? "text-emerald-500 animate-pulse" : "text-zinc-500"}`}>
              {formatLastActive() === "online" ? "Online" : `Last active ${formatLastActive()}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMUserRow;
