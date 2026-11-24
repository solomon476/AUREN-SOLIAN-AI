import React, { useState, useRef } from 'react';
import { Camera, Trash2, Upload, CheckCircle2, AlertCircle, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';
import { SolianApiClient } from '../../api/client';

export const ProfileSettingsSection: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Unsupported image format. Please select a JPEG, PNG, or WebP image.',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage({
        type: 'error',
        text: 'File size exceeds maximum limit of 5MB.',
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setMessage(null);
  };

  const handleSavePicture = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setMessage(null);

    try {
      const res = await SolianApiClient.uploadAvatar(selectedFile);
      if (res.success && res.avatarUrl) {
        updateUserProfile({ avatarUrl: res.avatarUrl });
        setMessage({
          type: 'success',
          text: 'Profile picture uploaded and updated successfully.',
        });
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to upload profile picture.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (previewUrl && selectedFile) {
      // Just cancel the uncommitted preview
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!user.avatarUrl) return;

    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await SolianApiClient.deleteAvatar();
      if (res.success) {
        updateUserProfile({ avatarUrl: undefined });
        setMessage({
          type: 'success',
          text: 'Profile picture removed. Reverted to default avatar.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to remove profile picture.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (user.role === 'guest') {
    return (
      <div className="bg-white bg-solian-card rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Personal Profile Settings
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Visitor Mode
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
            V
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Public Visitor Session</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Personal profile picture management and staff directory personalization require an authenticated corporate account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gold-500 text-slate-950 text-xs font-bold uppercase hover:bg-gold-400 transition shrink-0 cursor-pointer min-h-[40px] flex items-center justify-center shadow-sm"
          >
            Sign In to Corporate Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white bg-solian-card rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm text-slate-900">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-600" />
            Personal Profile Picture
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Manage your personal profile picture displayed across Solian Wolves company records and directory.
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30">
          Personalization
        </span>
      </div>

      {message && (
        <div
          className={`mb-4 p-2.5 rounded-lg text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
        {/* Avatar Display / Preview */}
        <div className="relative group shrink-0">
          <UserAvatar
            name={user.fullName}
            avatarUrl={previewUrl || user.avatarUrl}
            size="lg"
            role={user.role}
            className="w-16 h-16 sm:w-20 sm:h-20 ring-2 ring-amber-500/20 shadow-md"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 bg-white border border-amber-500/40 rounded-full text-amber-700 hover:text-amber-900 hover:bg-amber-50 transition-all shadow-md cursor-pointer"
            title="Upload new image"
            aria-label="Upload new image"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls & Details */}
        <div className="flex-1 space-y-2.5 text-center sm:text-left min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">{user.fullName}</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">{user.title}</div>
            {user.department && <div className="text-[11px] text-slate-500">{user.department}</div>}
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <>
                <button
                  type="button"
                  onClick={handleSavePicture}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-lg bg-gold-500 text-slate-950 text-xs font-semibold hover:bg-gold-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px] shadow-sm"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Save Picture
                </button>
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-all cursor-pointer min-h-[36px]"
                >
                  Cancel Preview
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-amber-500/40 text-amber-800 hover:bg-amber-50 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </button>

                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePicture}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove
                  </button>
                )}
              </>
            )}
          </div>

          <div className="pt-1 text-[10.5px] text-slate-500">
            <span>• Supported formats: JPEG, PNG, WebP ≤ 5MB (auto-cropped to 512×512).</span>
          </div>
        </div>
      </div>
    </div>
  );
};

