import React, { useState } from "react";
import { useChat } from "../context/ChatContext";
import { UserPost, PostComment } from "../types";
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Trash2, 
  Eye, 
  Send, 
  Globe, 
  Users, 
  Lock,
  MessageSquare,
  X,
  Maximize2
} from "lucide-react";

interface FeedPostItemProps {
  post: UserPost;
  onUserClick: (uid: string) => void;
}

export const FeedPostItem: React.FC<FeedPostItemProps> = ({ post, onUserClick }) => {
  const { 
    currentUser, 
    userProfile, 
    toggleLikePost, 
    addCommentToPost, 
    deletePost, 
    savePost, 
    unsavePost,
    theme
  } = useChat();

  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isLight = theme === "light";

  const likesCount = post.likes ? Object.keys(post.likes).length : 0;
  const likedByMe = currentUser && post.likes ? !!post.likes[currentUser.uid] : false;

  const commentsCount = post.comments ? Object.keys(post.comments).length : 0;
  
  const savedByMe = userProfile && userProfile.savedPosts ? !!userProfile.savedPosts[post.id] : false;

  const isMyPost = currentUser?.uid === post.userId;

  const handleToggleSave = async () => {
    try {
      if (savedByMe) {
        await unsavePost(post.id);
      } else {
        await savePost(post.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addCommentToPost(post.id, commentText);
      setCommentText("");
    } catch (err) {
      console.error(err);
    }
  };

  const getVisibilityIcon = () => {
    if (post.visibility === "global") {
      return <Globe size={11} className={`${isLight ? "text-zinc-650" : "text-zinc-400"}`} title="Publicly visible" />;
    } else if (post.visibility === "friends") {
      return <Users size={11} className={`${isLight ? "text-zinc-650" : "text-zinc-400"}`} title="Visible to friends" />;
    } else {
      return <Lock size={11} className="text-zinc-500" title="Private to creator" />;
    }
  };

  return (
    <div className={`p-4 border rounded-2xl space-y-3.5 transition-all overflow-hidden select-none hover:shadow-xs ${
      isLight 
        ? "bg-zinc-50 border-zinc-200 text-zinc-900" 
        : "bg-zinc-90 w-full bg-zinc-900/60 border-zinc-850 text-white"
    }`}>
      
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onUserClick(post.userId)}
          className="flex items-center space-x-3 text-left focus:outline-none shrink-0 group cursor-pointer"
        >
          <img 
            src={post.userAvatarUrl} 
            alt={post.username} 
            className={`w-10 h-10 rounded-xl bg-zinc-805 object-cover border transition-colors ${
              isLight ? "border-zinc-205 group-hover:border-black" : "border-zinc-800 group-hover:border-zinc-400"
            }`} 
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <span className={`font-bold text-xs ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>@{post.username}</span>
              {getVisibilityIcon()}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {new Date(post.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </button>

        {isMyPost && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to delete this post?")) {
                deletePost(post.id);
              }
            }}
            className={`p-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${
              isLight 
                ? "bg-zinc-100 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" 
                : "bg-zinc-950/40 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-450 hover:border-rose-500/20"
            }`}
            title="Delete this post"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Caption description */}
      {post.text && (
        <p className={`text-xs leading-relaxed break-words whitespace-pre-wrap select-text ${
          isLight ? "text-zinc-800" : "text-zinc-200"
        }`}>
          {post.text}
        </p>
      )}

      {/* Multiple Image visual grid layout */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div 
          className={`grid gap-1.5 rounded-2xl overflow-hidden max-h-[300px] border ${
            isLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-zinc-950"
          }`}
          style={{
            gridTemplateColumns: post.imageUrls.length === 1 ? "1fr" : "repeat(2, 1fr)"
          }}
        >
          {post.imageUrls.map((url, idx) => (
            <div key={idx} className="relative group/img aspect-video cursor-pointer bg-zinc-950">
              <img 
                src={url} 
                alt={`Uploaded asset ${idx}`} 
                className="w-full h-full object-cover opacity-90 group-hover/img:opacity-100 transition-opacity" 
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setLightboxUrl(url)}
                className="absolute bottom-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity duration-200"
              >
                <Maximize2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Interactions buttons section */}
      <div className={`flex items-center justify-between border-t border-b p-1 text-xs text-zinc-500 select-none ${
        isLight ? "border-zinc-200/60 text-zinc-650" : "border-zinc-800/60 text-zinc-400"
      }`}>
        
        {/* Likes action */}
        <button
          type="button"
          onClick={() => toggleLikePost(post.id)}
          className={`flex-1 py-1.5 px-2.5 flex items-center justify-center space-x-1.5 rounded-lg transition-colors cursor-pointer ${
            likedByMe 
              ? isLight ? "text-black bg-zinc-200/60 font-bold" : "text-white bg-zinc-800 font-bold" 
              : isLight ? "hover:bg-zinc-200/40 hover:text-black" : "hover:bg-zinc-850 hover:text-white"
          }`}
        >
          <Heart size={14} fill={likedByMe ? "currentColor" : "none"} />
          <span>{likesCount} likes</span>
        </button>

        {/* Comments popup expand triggers */}
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 py-1.5 px-2.5 flex items-center justify-center space-x-1.5 rounded-lg transition-colors cursor-pointer ${
            showComments 
              ? isLight ? "text-black bg-zinc-200/60 font-bold" : "text-white bg-zinc-800 font-bold" 
              : isLight ? "hover:bg-zinc-200/40 hover:text-black" : "hover:bg-zinc-850 hover:text-white"
          }`}
        >
          <MessageCircle size={14} />
          <span>{commentsCount} comments</span>
        </button>

        {/* Saved posts actions */}
        <button
          type="button"
          onClick={handleToggleSave}
          className={`flex-1 py-1.5 px-2.5 flex items-center justify-center space-x-1.5 rounded-lg transition-colors cursor-pointer ${
            savedByMe 
              ? "text-rose-500 font-bold bg-rose-500/5 dark:bg-rose-950/10" 
              : isLight ? "hover:bg-zinc-200/40 hover:text-black" : "hover:bg-zinc-850 hover:text-white"
          }`}
        >
          <Bookmark size={14} fill={savedByMe ? "currentColor" : "none"} />
          <span>{savedByMe ? "Saved" : "Save"}</span>
        </button>

      </div>

      {/* Expanded Interactive Comments board */}
      {showComments && (
        <div className={`p-3.5 rounded-2xl border mt-2 space-y-4 animate-in slide-in-from-top-2 duration-200 ${
          isLight ? "bg-zinc-100/50 border-zinc-200" : "bg-zinc-950/60 border-zinc-850"
        }`}>
          
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Dialogue thread ({commentsCount})
            </h4>
          </div>

          {/* Comment Stream */}
          <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
            {post.comments && Object.keys(post.comments).length > 0 ? (
              Object.values(post.comments).map((comment: PostComment, idx) => (
                <div key={`${comment.id}-${idx}`} className="flex space-x-2.5 items-start">
                  <button
                    type="button"
                    onClick={() => onUserClick(comment.userId)}
                    className="shrink-0 cursor-pointer"
                  >
                    <img 
                      src={comment.avatarUrl} 
                      alt={comment.username} 
                      className={`w-7 h-7 rounded-lg bg-zinc-800 object-cover border ${
                        isLight ? "border-zinc-200" : "border-zinc-800"
                      }`} 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <div className={`flex-1 border rounded-xl p-2.5 select-text text-[11px] ${
                    isLight ? "bg-white border-zinc-200" : "bg-zinc-900 border-zinc-850"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>@{comment.username}</span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`mt-1 leading-relaxed break-all ${isLight ? "text-zinc-700" : "text-zinc-300"}`}>{comment.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-zinc-500 text-center py-2 italic font-mono select-none">No feedback submitted yet.</p>
            )}
          </div>

          {/* Inline Submission box */}
          <form onSubmit={handleAddComment} className={`flex space-x-2 pt-2.5 select-none border-t ${
            isLight ? "border-zinc-200/60" : "border-zinc-800/40"
          }`}>
            <input
              type="text"
              placeholder="Post a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className={`flex-1 px-3 py-1.5 text-[11px] rounded-xl focus:outline-none transition-colors border ${
                isLight 
                  ? "bg-white border-zinc-205 text-zinc-900 placeholder-zinc-405 focus:border-black" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-550 focus:border-zinc-600"
              }`}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                isLight 
                  ? "bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400" 
                  : "bg-white text-black hover:bg-zinc-100 disabled:bg-zinc-900 disabled:text-zinc-600"
              }`}
            >
              <Send size={11} />
            </button>
          </form>

        </div>
      )}

      {/* FULL RES VISUAL IMAGE OVERLAY */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <button 
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 bg-zinc-900 text-zinc-400 rounded-lg border border-zinc-800 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
            <img src={lightboxUrl} alt="High resolution" className="object-contain max-h-[85vh] max-w-full" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}

    </div>
  );
};

export default FeedPostItem;
