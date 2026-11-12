import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  RotateCcw,
  Smartphone,
  Monitor,
  Sparkles,
  Cloud,
  CheckCircle2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppLogo } from './AppLogo';
import { generateAppIcons, applyIconsToDocument, GeneratedIcons } from '../utils/iconGenerator';
import { uploadLogoToSupabase, getSupabaseClient } from '../lib/supabase';

export const LogoUploaderSection: React.FC = () => {
  const { settings, updateSettings, isSupabaseConnected } = useApp();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(settings.customLogoUrl || null);
  const [generatedIcons, setGeneratedIcons] = useState<GeneratedIcons | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [storageDestination, setStorageDestination] = useState<string>('Yoxlanılır...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check where logo will be stored
  useEffect(() => {
    if (isSupabaseConnected) {
      setStorageDestination('Supabase Storage ("app-assets" bucket)');
    } else {
      setStorageDestination('Lokal Yaddaş (Supabase qoşulmadıqda IndexedDB/LocalStorage)');
    }
  }, [isSupabaseConnected]);

  // Update preview if external settings change
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(settings.customLogoUrl || null);
      if (settings.customLogoUrl) {
        generateAppIcons(settings.customLogoUrl)
          .then(icons => setGeneratedIcons(icons))
          .catch(() => {});
      }
    }
  }, [settings.customLogoUrl, selectedFile]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Zəhmət olmasa yalnız şəkil faylı seçin (PNG, JPG, WebP, SVG).' });
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Fayl ölçüsü maksimum 5MB ola bilər.' });
      return;
    }

    setSelectedFile(file);
    setStatusMessage(null);

    // Read as Data URL for immediate preview and canvas icon generation
    const reader = new FileReader();
    reader.onload = async event => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);

      try {
        const icons = await generateAppIcons(dataUrl);
        setGeneratedIcons(icons);
      } catch (err) {
        console.warn('Preview icon generation warning:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save & Apply Logo
  const handleSaveLogo = async () => {
    if (!previewUrl) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      let finalLogoUrl = previewUrl;
      let usedSupabaseStorage = false;

      // 1. If Supabase is connected and we have a File, upload to Supabase Storage
      const supabase = getSupabaseClient();
      if (supabase && selectedFile) {
        const uploadRes = await uploadLogoToSupabase(selectedFile, selectedFile.name);
        if (uploadRes.success && uploadRes.publicUrl) {
          finalLogoUrl = uploadRes.publicUrl;
          usedSupabaseStorage = true;
        } else {
          console.warn('Supabase storage upload failed, falling back to base64:', uploadRes.error);
          // Still proceeds with base64 so user never loses their logo
        }
      }

      // 2. Generate multi-resolution icons (iPhone, Samsung/Android, Favicon)
      const icons = await generateAppIcons(finalLogoUrl);
      setGeneratedIcons(icons);

      // 3. Dynamically apply to browser document head and PWA manifest
      applyIconsToDocument(icons, settings.barName);

      // 4. Update settings in Context & Supabase
      updateSettings({
        customLogoUrl: finalLogoUrl,
        logoUpdatedAt: new Date().toISOString(),
      });

      setSelectedFile(null);
      setStatusMessage({
        type: 'success',
        text: usedSupabaseStorage
          ? 'Loqo uğurla Supabase Storage-ə yükləndi və iPhone, PC, Android ana ekran ikonları yeniləndi!'
          : 'Loqo uğurla tətbiq edildi və bütün cihaz ikonları yeniləndi (Lokal rejimdə saxlanıldı).',
      });
    } catch (err: any) {
      console.error('Save logo error:', err);
      setStatusMessage({
        type: 'error',
        text: `Loqo tətbiq edilərkən xəta: ${err?.message || 'Bilinməyən xəta'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to default logo
  const handleResetToDefault = () => {
    if (confirm('Fərdi loqonu silib ilkin standart loqoya qaytarmaq istəyirsiniz?')) {
      updateSettings({
        customLogoUrl: undefined,
        logoUpdatedAt: new Date().toISOString(),
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setGeneratedIcons(null);
      localStorage.removeItem('zalbar_dynamic_icons');
      // Reload page head to restore defaults
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload & Storage Info Card */}
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">
                Fərdi Loqo və Ana Ekran İkonu İdarəedicisi
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Yüklədiyiniz loqo həm proqram daxilində (header, kassa, giriş), həm də iPhone, PC və Samsung (Android) ana ekran ikonunda avtomatik tətbiq olunur.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Saxlama Yeri:</span>
            <span className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
              isSupabaseConnected
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-zinc-950 text-zinc-300 border-zinc-800'
            }`}>
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSupabaseConnected ? 'Supabase Storage' : 'Lokal / Offline'}</span>
            </span>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border border-red-800 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* File Select & Dropzone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Yeni Loqo Faylı Seçin
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-red-500 bg-zinc-950/80 rounded-3xl p-6 text-center cursor-pointer transition-all hover:bg-zinc-800/30 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-red-600/20 text-zinc-400 group-hover:text-red-400 flex items-center justify-center mx-auto transition-colors border border-zinc-700 group-hover:border-red-500/50">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white mt-3 group-hover:text-red-400 transition-colors">
                {selectedFile ? selectedFile.name : 'Loqo şəklini seçmək üçün klikləyin'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                PNG, JPG, WebP və ya SVG (Məsləhət: Şəffaf fonlu kvadrat və ya dairəvi loqo)
              </p>
            </div>
          </div>

          {/* Current Logo and Actions */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Cari Aktiv Loqo
              </span>
              <div className="flex items-center gap-4">
                <AppLogo size="lg" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {settings.barName}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    {settings.customLogoUrl ? 'Fərdi yüklənmiş loqo aktivdir' : 'Standart idman zalı loqosu aktivdir'}
                  </p>
                  {settings.customLogoUrl && (
                    <span className="text-[10px] text-emerald-400 font-mono block mt-0.5 truncate max-w-xs">
                      {settings.customLogoUrl.startsWith('data:') ? 'Lokal Base64' : 'Supabase Storage CDN'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={isProcessing || !previewUrl}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center gap-2"
              >
                {isProcessing ? (
                  <span>Saxlanılır və İkonlar Yaradılır...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Loqonu Yadda Saxla və Tətbiq Et</span>
                  </>
                )}
              </button>

              {settings.customLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-zinc-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Standart Loqoya Qaytar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          CANLI ÖNİZLƏMƏ BÖLMƏSİ (İPHONE, SAMSUNG, PC, PROQRAM İÇİ)
         ────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl space-y-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Müxtəlif Cihazlarda Canlı Önizləmə</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Yüklənən loqodan iPhone, Samsung / Android və PC üçün avtomatik yaradılan ikonların necə görünəcəyinə baxın:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. iPhone Home Screen (Apple Touch Icon 180x180) */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>iPhone Ana Ekranı</span>
            </div>

            {/* Simulated iOS Squircle Icon */}
            <div className="w-20 h-20 rounded-[22px] bg-zinc-900 border border-zinc-700/80 shadow-2xl p-2 flex items-center justify-center overflow-hidden relative group">
              {previewUrl ? (
                <img src={previewUrl} alt="iPhone Icon" className="w-full h-full object-contain" />
              ) : (
                <AppLogo size="lg" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {settings.barName}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">apple-touch-icon 180x180</span>
            </div>
          </div>

          {/* 2. Samsung / Android Home Screen (Maskable 192/512) */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Samsung / Android</span>
            </div>

            {/* Simulated Android Circle Adaptive Icon */}
            <div className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-zinc-700 shadow-2xl p-2.5 flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Android Icon" className="w-full h-full object-contain" />
              ) : (
                <AppLogo size="lg" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {settings.barName}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">manifest 192/512 maskable</span>
            </div>
          </div>

          {/* 3. PC Browser Tab & Favicon */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>PC Brauzer Sekmesi</span>
            </div>

            {/* Simulated Browser Tab */}
            <div className="w-full h-20 rounded-xl bg-zinc-900 border border-zinc-800 p-2 flex flex-col justify-center">
              <div className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center gap-2 max-w-[180px] mx-auto">
                <div className="w-4 h-4 rounded overflow-hidden shrink-0 flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Favicon" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-3 h-3 bg-red-600 rounded-xs" />
                  )}
                </div>
                <span className="text-[10px] font-medium text-zinc-200 truncate">
                  {settings.barName} — POS
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-white">
                Favicon & Başlıq
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">favicon 64x64 PNG</span>
            </div>
          </div>

          {/* 4. In-App Header & POS */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              <span>Proqram İçi (Header/Giriş)</span>
            </div>

            {/* Simulated Header Bar */}
            <div className="w-full h-20 rounded-xl bg-zinc-900 border border-zinc-800 p-2 flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Header" className="w-full h-full object-cover" />
                  ) : (
                    <AppLogo size="sm" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[90px]">
                    {settings.barName}
                  </div>
                  <div className="text-[9px] text-red-500 font-semibold">İdarəetmə & POS</div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-white">
                Sidebar & Başlıq
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">Bütün səhifələrdə eyni</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
