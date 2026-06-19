import React, { useState, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { uploadImageToImgBB } from "../utils/imageUpload";
import { 
  Mail, 
  Lock, 
  Image as ImageIcon, 
  Loader2, 
  LogIn, 
  UserPlus, 
  UploadCloud, 
  Eye, 
  EyeOff
} from "lucide-react";

export default function LoginForm() {
  const { loginUser, registerUser, allUsers, theme } = useChat();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");
  const isUsernameTaken = cleanUsername.length >= 3 && allUsers.some(u => u.username === cleanUsername);

  const generateRandomAvatar = () => {
    if (!username.trim()) {
      setError("Please input a username first to generate a seed avatar.");
      return;
    }
    setError(null);
    const seed = encodeURIComponent(username.trim().toLowerCase());
    setAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const url = await uploadImageToImgBB(file);
      setAvatarUrl(url);
    } catch (err: any) {
      setError("Failed to upload image.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    if (isSignUp && !username.trim()) {
      setError("Username is required.");
      return;
    }
    if (isSignUp && isUsernameTaken) {
      setError("This username is already taken.");
      return;
    }

    setAuthLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await registerUser(email.trim(), username.trim(), password, avatarUrl);
      } else {
        await loginUser(email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication credentials mismatch.");
    } finally {
      setAuthLoading(false);
    }
  };

  const isLight = theme === "light";

  return (
    <div className={`flex flex-col h-full select-none relative overflow-y-auto px-6 py-12 transition-all duration-300 ${
      isLight ? "bg-white text-zinc-900" : "bg-black text-white"
    }`}>
      
      {/* Redesigned Minimalist Monochromatic Header */}
      <div className="flex flex-col items-center text-center mt-4 mb-8">
        <div id="welcome-logo-badge" className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border transition-all ${
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-800"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm uppercase ${
            isLight ? "bg-black text-white" : "bg-white text-black"
          }`}>
            A
          </div>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight">
          {isSignUp ? "Connect & Discuss" : "Welcome Back"}
        </h1>
        <p className="text-xs text-zinc-500 mt-2 px-6 leading-relaxed max-w-sm">
          A high-performance global system configured for flawless communications.
        </p>
      </div>

      {/* Alert Messaging */}
      {error && (
        <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs text-center font-mono leading-relaxed">
          {error}
        </div>
      )}

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto w-full text-xs">
        
        {isSignUp && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Choose Handle Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">@</span>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className={`w-full pl-7 pr-10 py-3 rounded-xl text-xs focus:outline-none transition-colors border ${
                    isUsernameTaken 
                      ? "border-rose-500 bg-rose-500/5 text-rose-400" 
                      : cleanUsername.length >= 3 
                        ? "border-emerald-500 bg-emerald-500/5 text-emerald-400" 
                        : isLight 
                          ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-black" 
                          : "bg-zinc-900 border-zinc-850 text-white focus:border-white"
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  {isUsernameTaken ? (
                    <span className="text-[10px] text-rose-500 font-bold font-mono">Taken</span>
                  ) : cleanUsername.length >= 3 ? (
                    <span className="text-[10px] text-emerald-500 font-bold font-mono">Available</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/40 border-zinc-850"
            }`}>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Avatar Customization
              </label>
              <div className="flex items-center space-x-3.5">
                <div className={`relative w-12 h-12 rounded-lg border overflow-hidden flex items-center justify-center shrink-0 ${
                  isLight ? "bg-zinc-200 border-zinc-305" : "bg-zinc-800 border-zinc-700"
                }`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={18} className="text-zinc-500" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={12} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col space-y-1.5">
                  <div className="flex space-x-1.5 font-mono">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 py-1.5 px-3 border text-[10px] rounded-lg font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                        isLight ? "bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-800" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white"
                      }`}
                    >
                      <UploadCloud size={11} />
                      <span>Upload Avatar</span>
                    </button>
                    <button
                      type="button"
                      onClick={generateRandomAvatar}
                      className={`flex-1 py-1.5 px-2 border text-[10px] rounded-lg font-bold transition-all cursor-pointer ${
                        isLight ? "bg-black text-white hover:bg-zinc-850 border-transparent" : "bg-white text-black hover:bg-zinc-200 border-transparent"
                      }`}
                    >
                      Instant Seed
                    </button>
                  </div>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Enter Registered Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
              <Mail size={14} />
            </span>
            <input
              type="email"
              required
              placeholder="user@network.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-xs focus:outline-none transition-all ${
                isLight 
                  ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-black placeholder-zinc-400" 
                  : "bg-zinc-900 border-zinc-850 text-white focus:border-white placeholder-zinc-500"
              }`}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center select-none font-mono">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Security Code Key
            </label>
            {!isSignUp && (
              <button 
                type="button" 
                onClick={() => alert("Please sign up if credentials are forgotten.")}
                className="text-[9px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Forgot Password?
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
              <Lock size={14} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-10 pr-10 py-3 border rounded-xl text-xs focus:outline-none transition-all ${
                isLight 
                  ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-black placeholder-zinc-400" 
                  : "bg-zinc-900 border-zinc-850 text-white focus:border-white placeholder-zinc-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={authLoading || uploading || (isSignUp && isUsernameTaken)}
          className={`w-full py-3 border font-extrabold rounded-xl text-xs tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer mt-6 uppercase font-mono ${
            isLight 
              ? "bg-black text-white hover:bg-zinc-900 border-transparent disabled:bg-zinc-200 disabled:text-zinc-400" 
              : "bg-white text-black hover:bg-zinc-100 border-transparent disabled:bg-zinc-800 disabled:text-zinc-600"
          }`}
        >
          {authLoading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Verifying Connection...</span>
            </>
          ) : isSignUp ? (
            <>
              <UserPlus size={13} />
              <span>Establish Profile</span>
            </>
          ) : (
            <>
              <LogIn size={13} />
              <span>Open Signal Session</span>
            </>
          )}
        </button>
      </form>

      {/* Bottom Switch */}
      <div className="mt-12 text-center select-none font-mono">
        {isSignUp ? (
          <p className="text-[11px] text-zinc-400">
            Already registered?{" "}
            <button 
              type="button" 
              onClick={() => setIsSignUp(false)} 
              className={`font-bold uppercase ${isLight ? "text-black hover:underline" : "text-white hover:underline"}`}
            >
              Sign In
            </button>
          </p>
        ) : (
          <p className="text-[11px] text-zinc-400">
            Need access?{" "}
            <button 
              type="button" 
              onClick={() => setIsSignUp(true)} 
              className={`font-bold uppercase ${isLight ? "text-black hover:underline" : "text-white hover:underline"}`}
            >
              Register Account
            </button>
          </p>
        )}
      </div>

    </div>
  );
}
