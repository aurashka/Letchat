import React, { useState } from "react";
import { useChat } from "../context/ChatContext";
import { uploadImageToImgBB } from "../utils/imageUpload";
import { 
  ShieldAlert, 
  Save, 
  User, 
  Image as ImageIcon, 
  Lock, 
  Loader2, 
  ChevronLeft, 
  Check, 
  LogOut,
  AppWindow,
  FileCode,
  Sparkles
} from "lucide-react";

interface SettingsPanelProps {
  onBack: () => void;
}

export default function SettingsPanel({ onBack }: SettingsPanelProps) {
  const { 
    userProfile, 
    updateProfileDetails, 
    updateUsername, 
    updateProfileAvatar, 
    logoutUser,
    theme,
    setTheme
  } = useChat();

  const [bioText, setBioText] = useState(userProfile?.bio || "");
  const [handleText, setHandleText] = useState(userProfile?.username || "");
  const [privateAccount, setPrivateAccount] = useState(userProfile?.isPrivate || false);
  
  const [uploading, setUploading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorText("");
    setSuccessText("");

    try {
      const url = await uploadImageToImgBB(file);
      await updateProfileAvatar(url);
      setSuccessText("Profile avatar updated successfully!");
    } catch (err: any) {
      setErrorText("Failed to upload avatar to ImgBB.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSave(true);
    setErrorText("");
    setSuccessText("");

    try {
      // 1. Update Bio & privacy
      await updateProfileDetails(bioText.trim(), privateAccount);
      
      // 2. Try update handle if changed
      if (handleText.trim().toLowerCase() !== userProfile?.username) {
        await updateUsername(handleText.trim());
      }

      setSuccessText("Preferences updated successfully!");
    } catch (err: any) {
      setErrorText(err.message || "An error occurred while updating profile.");
    } finally {
      setLoadingSave(false);
    }
  };

  const isLight = theme === "light";

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-all ${
      isLight ? "bg-white text-zinc-900" : "bg-zinc-950 text-white"
    }`}>
      
      {/* Settings Navigation Header */}
      <div className={`h-16 border-b flex items-center justify-between px-4 shrink-0 transition-colors ${
        isLight ? "border-zinc-100 bg-white" : "border-zinc-900 bg-zinc-950"
      }`}>
        <button
          type="button"
          onClick={onBack}
          className={`py-1.5 px-3 border rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-all ${
            isLight 
              ? "bg-zinc-50 hover:bg-zinc-100 border-zinc-205 text-zinc-800" 
              : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
          }`}
        >
          <ChevronLeft size={14} />
          <span>Back</span>
        </button>
        <span className="text-xs font-bold font-mono text-zinc-500">Settings</span>
        <div className="w-12 h-2" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile overview card summary snippet */}
        <div className={`p-5 rounded-2xl border flex items-center space-x-4 transition-all ${
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
        }`}>
          <label className="relative cursor-pointer group rounded-2xl shrink-0 select-none">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all overflow-hidden relative border ${
              isLight ? "bg-white border-zinc-300" : "bg-zinc-800 border-zinc-700"
            }`}>
              {userProfile?.avatarUrl ? (
                <img 
                  src={userProfile.avatarUrl} 
                  alt="Avatar" 
                  className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" 
                  referrerPolicy="no-referrer"
                />
              ) : null}
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg opacity-90 transition-opacity ${
              isLight ? "bg-black text-white" : "bg-white text-black"
            }`}>
              <ImageIcon size={10} />
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
              disabled={uploading} 
              className="hidden" 
            />
          </label>

          <div>
            <h3 className={`font-bold text-sm ${isLight ? "text-zinc-900" : "text-white"}`}>@{userProfile?.username}</h3>
            <p className="text-[10px] text-zinc-500 font-mono">{userProfile?.email}</p>
            <p className="text-[9px] text-zinc-400 mt-1 uppercase font-bold tracking-wider">Tap image to update avatar</p>
          </div>
        </div>

        {/* Display feedback alerts */}
        {errorText && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium font-mono">
            {errorText}
          </div>
        )}

        {successText && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl flex items-center space-x-1.5 font-medium font-mono">
            <Check size={14} className="shrink-0" />
            <span>{successText}</span>
          </div>
        )}

        {/* Core Settings Preferences Form */}
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          
          {/* Unique handle input */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              My handle
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 font-mono">@</span>
              <input
                type="text"
                required
                value={handleText}
                onChange={(e) => setHandleText(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                className={`w-full pl-7 pr-3 py-2.5 text-xs rounded-xl focus:outline-none transition-colors border ${
                  isLight 
                    ? "bg-white border-zinc-205 text-zinc-900 placeholder-zinc-400 focus:border-black" 
                    : "bg-zinc-950 border-zinc-805 text-zinc-100 placeholder-zinc-550 focus:border-zinc-500"
                }`}
              />
            </div>
            <p className="text-[10px] text-zinc-550 leading-normal">
              Changing this replaces your login username and unique pointer.
            </p>
          </div>

          {/* Simple Bio textarea */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Biography
            </label>
            <textarea
              rows={3}
              placeholder="Tell other users about yourself..."
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              className={`w-full p-3 text-xs rounded-xl focus:outline-none transition-colors border leading-relaxed ${
                isLight 
                  ? "bg-white border-zinc-205 text-zinc-900 placeholder-zinc-400 focus:border-black" 
                  : "bg-zinc-950 border-zinc-805 text-zinc-100 placeholder-zinc-550 focus:border-zinc-500"
              }`}
            />
          </div>

          {/* Theme toggles buttons */}
          <div className={`space-y-2 p-4 border rounded-2xl transition-colors ${
            isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
          }`}>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Interface Theme Mode
            </label>
            <div className="flex space-x-2 pt-1 font-mono">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex-1 py-3 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  theme === "light"
                    ? "bg-black text-white border-black shadow-sm"
                    : "bg-transparent text-zinc-550 border-zinc-200 hover:text-zinc-800"
                }`}
              >
                <span>Light Theme</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex-1 py-3 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  theme === "dark"
                    ? "bg-white text-black border-white shadow-sm"
                    : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-200"
                }`}
              >
                <span>Dark Theme</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal pt-1 italic font-light">
              Toggle light and dark palettes interactively.
            </p>
          </div>

          {/* Settings Privacy Flag Checkbox */}
          <div className={`p-4 border rounded-2xl flex items-start justify-between transition-colors ${
            isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-850"
          }`}>
            <div className="space-y-1 pr-4">
              <label className={`block text-xs font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
                Private Account Lock
              </label>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-light">
                When active, profile posts and handles are hidden from search to shield updates.
              </p>
            </div>
            <input
              type="checkbox"
              checked={privateAccount}
              onChange={(e) => setPrivateAccount(e.target.checked)}
              className={`w-5 h-5 rounded border mt-1 cursor-pointer shrink-0 transition-colors focus:ring-0 ${
                isLight ? "bg-white border-zinc-300" : "bg-zinc-950 border-zinc-700"
              }`}
            />
          </div>

          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={logoutUser}
              className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-rose-600 border border-transparent font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 shrink-0 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-rose-400"
              title="Terminate session"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={loadingSave}
              className={`flex-1 py-2.5 px-4 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                isLight 
                  ? "bg-black text-white hover:bg-zinc-800" 
                  : "bg-white text-black hover:bg-zinc-100"
              }`}
            >
              {loadingSave ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
