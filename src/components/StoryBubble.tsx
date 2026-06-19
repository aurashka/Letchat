import React, { useState } from "react";
import { useChat } from "../context/ChatContext";
import { uploadImageToImgBB } from "../utils/imageUpload";
import { Plus, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

interface UserStoriesGroup {
  userId: string;
  username: string;
  avatarUrl: string;
  stories: any[];
}

export default function StoryBubble() {
  const { allStories, friends, userProfile, createStory, theme } = useChat();
  const [uploading, setUploading] = useState(false);
  
  // Track which friend group is active and which index inside that group is active
  const [activeGroupIdx, setActiveGroupIdx] = useState<number | null>(null);
  const [activeStorySubIdx, setActiveStorySubIdx] = useState<number>(0);

  const isLight = theme === "light";

  // Filter stories: Only show stories from friends or yourself
  const allowedUserIds = new Set([
    userProfile?.uid,
    ...friends.map(f => f.uid)
  ]);

  const activeStories = allStories.filter(s => allowedUserIds.has(s.userId));

  // Group stories by userId (Exactly 1 indicator per user, with multiple stories inside)
  const groupsMap = new Map<string, typeof activeStories>();
  activeStories.forEach(story => {
    if (!groupsMap.has(story.userId)) {
      groupsMap.set(story.userId, []);
    }
    groupsMap.get(story.userId)!.push(story);
  });

  const storyGroups: UserStoriesGroup[] = Array.from(groupsMap.entries()).map(([userId, stories]) => {
    // Sort oldest stories first
    const sortedStories = [...stories].sort((a, b) => a.timestamp - b.timestamp);
    return {
      userId,
      username: stories[0].username,
      avatarUrl: stories[0].avatarUrl,
      stories: sortedStories
    };
  });

  // Handle uploading story image
  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(false);
    try {
      setUploading(true);
      const url = await uploadImageToImgBB(file);
      await createStory(url);
    } catch (err) {
      console.error("Story image upload failed:", err);
      alert("Failed to upload story image.");
    } finally {
      setUploading(false);
    }
  };

  const nextStory = () => {
    if (activeGroupIdx === null) return;
    const currentGroup = storyGroups[activeGroupIdx];
    
    if (activeStorySubIdx < currentGroup.stories.length - 1) {
      setActiveStorySubIdx(activeStorySubIdx + 1);
    } else if (activeGroupIdx < storyGroups.length - 1) {
      // Go to next friend's stories
      setActiveGroupIdx(activeGroupIdx + 1);
      setActiveStorySubIdx(0);
    } else {
      // End of everything
      setActiveGroupIdx(null);
      setActiveStorySubIdx(0);
    }
  };

  const prevStory = () => {
    if (activeGroupIdx === null) return;
    
    if (activeStorySubIdx > 0) {
      setActiveStorySubIdx(activeStorySubIdx - 1);
    } else if (activeGroupIdx > 0) {
      // Go to previous friend's stories (open their last story)
      const prevGroup = storyGroups[activeGroupIdx - 1];
      setActiveGroupIdx(activeGroupIdx - 1);
      setActiveStorySubIdx(prevGroup.stories.length - 1);
    } else {
      // Beginning of everything
      setActiveGroupIdx(null);
      setActiveStorySubIdx(0);
    }
  };

  const handleWatchAll = () => {
    if (storyGroups.length > 0) {
      setActiveGroupIdx(0);
      setActiveStorySubIdx(0);
    }
  };

  return (
    <div className="w-full px-4 select-none">
      {/* Header aligned like the mockup screenshot */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-base font-extrabold tracking-tight ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>
          Stories
        </h3>
        {storyGroups.length > 0 && (
          <button
            type="button"
            onClick={handleWatchAll}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Watch all
          </button>
        )}
      </div>

      <div id="stories-rail" className="flex items-center space-x-4 overflow-x-auto pb-2 pt-1 scrollbar-none">
        {/* Add own story element bubble slot */}
        <div className="flex flex-col items-center space-y-1 shrink-0">
          <label className="relative cursor-pointer group flex flex-col items-center">
            <div className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center transition-all overflow-hidden relative ${
              isLight 
                ? "bg-zinc-100 border-zinc-300 hover:border-zinc-500" 
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
            }`}>
              {userProfile?.avatarUrl ? (
                <img 
                  src={userProfile.avatarUrl} 
                  alt="My profile" 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-85" 
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div className={`absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                isLight ? "bg-black text-white" : "bg-white text-black"
              }`}>
                {uploading ? (
                  <Loader2 size={12} className="animate-spin text-inherit" />
                ) : (
                  <Plus size={14} />
                )}
              </div>
            </div>
            <span className={`text-[10px] font-semibold mt-1.5 ${
              isLight ? "text-zinc-500" : "text-zinc-400"
            }`}>
              Add story
            </span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleUploadStory} 
              disabled={uploading} 
              className="hidden" 
            />
          </label>
        </div>

        {/* Dynamic list of unique friend story bubbles grouped */}
        {storyGroups.map((group, idx) => {
          const hasMultiple = group.stories.length > 1;
          return (
            <button
              key={`${group.userId}-${idx}`}
              type="button"
              onClick={() => {
                setActiveGroupIdx(idx);
                setActiveStorySubIdx(0);
              }}
              className="flex flex-col items-center space-y-1 shrink-0 focus:outline-none group cursor-pointer"
            >
              <div className={`p-[2px] rounded-full hover:scale-105 transition-transform ${
                hasMultiple 
                  ? "bg-gradient-to-tr from-indigo-500 to-pink-500" 
                  : isLight 
                    ? "bg-zinc-200 border border-zinc-300" 
                    : "bg-zinc-850 border border-zinc-850"
              }`}>
                <div className={`w-13 h-13 rounded-full border-2 bg-zinc-950 overflow-hidden relative ${
                  isLight ? "border-white bg-white" : "border-zinc-950"
                }`}>
                  <img 
                    src={group.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"} 
                    alt={group.username} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {hasMultiple && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 border border-white dark:border-black rounded-full flex items-center justify-center">
                      <span className="text-[7px] text-white font-black leading-none">{group.stories.length}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-semibold truncate max-w-[62px] text-center ${
                isLight ? "text-zinc-600" : "text-zinc-300"
              }`}>
                {group.username}
              </span>
            </button>
          );
        })}
      </div>

      {/* FULL SCREEN DYNAMIC STORY SLIDESHOW LIGHTBOX */}
      {activeGroupIdx !== null && storyGroups[activeGroupIdx] && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          
          {/* Header controls overlay */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 text-white">
            <div className="flex items-center space-x-3">
              <img 
                src={storyGroups[activeGroupIdx].avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"} 
                alt={storyGroups[activeGroupIdx].username} 
                className="w-9 h-9 rounded-full border border-white/20 bg-slate-900 object-cover" 
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-xs font-bold text-white">@{storyGroups[activeGroupIdx].username}</p>
                <p className="text-[9px] text-white/50">
                  {new Date(storyGroups[activeGroupIdx].stories[activeStorySubIdx].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Stories counter indicators on top */}
            <div className="flex space-x-1 max-w-[120px] shrink-0">
              {storyGroups[activeGroupIdx].stories.map((s, sIdx) => (
                <div 
                  key={s.id} 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    sIdx === activeStorySubIdx 
                      ? "w-4 bg-white" 
                      : sIdx < activeStorySubIdx 
                        ? "w-1.5 bg-white/40" 
                        : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveGroupIdx(null);
                setActiveStorySubIdx(0);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Nav Controls via side clicking / overlay clicks */}
          <div className="absolute inset-y-0 left-4 my-auto h-12 flex items-center z-10">
            <button
              onClick={prevStory}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white cursor-pointer transition-all"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          <div className="absolute inset-y-0 right-4 my-auto h-12 flex items-center z-10">
            <button
              onClick={nextStory}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white cursor-pointer transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Story Image container */}
          <div 
            onClick={(e) => {
              // Click right/left side of the image to navigate
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              if (clickX > rect.width / 2) {
                nextStory();
              } else {
                prevStory();
              }
            }}
            className="max-w-md w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-2xl relative cursor-pointer group"
          >
            <img 
              src={storyGroups[activeGroupIdx].stories[activeStorySubIdx].imageUrl} 
              alt="Story segment" 
              className="object-contain max-h-[75vh] max-w-full rounded-2xl select-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
