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

  return (
    <div className="bg-solian-card rounded-xl border border-solian-border p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-solian-border mb-6">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-gold-500" />
            Personal Profile Picture
          </h2>
          <p className="text-xs text-graphite-400 mt-0.5">
            Manage your personal profile picture displayed across Solian Wolves company records, directory, and communications.
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/30">
          Personalization
        </span>
      </div>

      {message && (
        <div
          className={`mb-5 p-3 rounded-lg text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar Display / Preview */}
        <div className="relative group shrink-0">
          <UserAvatar
            name={user.fullName}
            avatarUrl={previewUrl || user.avatarUrl}
            size="xl"
            role={user.role}
            className="w-24 h-24 ring-2 ring-gold-500/20 shadow-lg"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-solian-surface border border-gold-500/40 rounded-full text-gold-400 hover:text-white hover:bg-gold-500/20 transition-all shadow-md cursor-pointer"
            title="Upload new image"
            aria-label="Upload new image"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Details */}
        <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-sm font-bold text-white truncate">{user.fullName}</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-graphite-300 mt-0.5">{user.title}</div>
            <div className="text-[11px] text-graphite-400">{user.department}</div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
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
                  className="px-3.5 py-1.5 rounded-lg bg-gold-500 text-solian-darkest text-xs font-semibold hover:bg-gold-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Save Profile Picture
                </button>
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="px-3 py-1.5 rounded-lg bg-solian-surface border border-solian-border text-xs text-slate-300 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-all cursor-pointer"
                >
                  Cancel Preview
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg bg-solian-surface border border-gold-500/40 text-gold-400 hover:bg-gold-500/15 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                </button>

                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePicture}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-lg bg-solian-surface border border-solian-border text-xs text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove
                  </button>
                )}
              </>
            )}
          </div>

          <div className="pt-2 text-[11px] text-graphite-400 space-y-1">
            <p>• Supported formats: JPEG, PNG, and WebP (max 5MB).</p>
            <p>• Images are automatically cropped, EXIF-sanitized, and optimized to 512×512 WebP.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

