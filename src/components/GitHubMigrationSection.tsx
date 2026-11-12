import React, { useState } from 'react';
import {
  GitBranch,
  ArrowUpRight,
  Copy,
  Check,
  Database,
  Cloud,
  Layers,
  Terminal,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  FolderPlus,
  Play,
  FileCode,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSupabaseClient } from '../lib/supabase';

export const GitHubMigrationSection: React.FC = () => {
  const { isSupabaseConnected } = useApp();
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
  const [bucketStatus, setBucketStatus] = useState<string | null>(null);
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);

  const SUPABASE_MIGRATION_SQL = `-- =================================================================
-- ZAL BARI & POS SİSTEMİ — MİQRASİYA V2 (LOQO & STORAGE DƏSTƏYİ)
-- =================================================================
-- Bu skripti Supabase Dashboard -> SQL Editor bölməsində icra edin.
-- Mövcud məlumatlarınızı (satışlar, borclar, məhsullar) POZMADAN
-- fərdi loqo və Supabase Storage qovluğunu aktivləşdirir.

-- 1. App Settings cədvəlinə fərdi loqo sütununu əlavə et
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. Loqolar üçün "app-assets" Storage Bucket-ini yarat (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage fayllarını hər kəsin oxuması üçün icazə (Public Read Policy)
DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
CREATE POLICY "Public Read Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'app-assets');

-- 4. Loqo yükləmək və dəyişmək üçün icazə (Insert & Update Policy)
DROP POLICY IF EXISTS "Allow Upload Assets" ON storage.objects;
CREATE POLICY "Allow Upload Assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "Allow Update Assets" ON storage.objects;
CREATE POLICY "Allow Update Assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "Allow Delete Assets" ON storage.objects;
CREATE POLICY "Allow Delete Assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'app-assets');

-- 5. Realtime cədvəllər siyahısında app_settings-in olduğundan əmin ol
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
`;

  const GIT_COMMANDS = `# 1. Mövcud layihədə GitHub ünvanınızı əlavə edin (əgər hələ əlavə etməmisinizsə):
git remote add origin https://github.com/TUNCAY-QU/zal-bar-pos.git

# 2. Bütün dəyişiklikləri göndərin:
git branch -M main
git push -u origin main --force
`;

  const copyToClipboard = (text: string, type: 'sql' | 'git') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } else {
      setCopiedGit(true);
      setTimeout(() => setCopiedGit(false), 2500);
    }
  };

  const handleAutoCreateBucket = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setBucketStatus('Xəta: Supabase qoşulmayıb! Əvvəlcə URL və Anon Key daxil edin.');
      return;
    }

    setIsCreatingBucket(true);
    setBucketStatus('Supabase Storage-də "app-assets" bucket-i yaradılır...');

    try {
      const { data, error } = await supabase.storage.createBucket('app-assets', {
        public: true,
      });

      if (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          setBucketStatus('"app-assets" storage bucket-i artıq mövcuddur və aktivdir ✓');
        } else {
          setBucketStatus(`Bildiriş: ${error.message}. Əgər icazə xətası verirsə, yuxarıdakı SQL skriptini Supabase SQL Editor-da icra edin.`);
        }
      } else {
        setBucketStatus('"app-assets" storage bucket-i uğurla yaradıldı və Public edildi ✓');
      }
    } catch (e: any) {
      setBucketStatus(`Xəta: ${e?.message || 'Bilinməyən xəta'}`);
    } finally {
      setIsCreatingBucket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <RefreshCw className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Köhnə Proqramın Yenilənməsi & GitHub / Supabase Miqrasiyası
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Hazırda işlətdiyiniz köhnə versiyanı yeni Xülasə, Loqo Yükləyici və Supabase Storage ilə avtomatik sinxronlaşdırın.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Mövcud Məlumatlar 100% Qorunur:</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Bu yeniləmə köhnə proqramınızdakı heç bir satışı, borcu, depozit balansını və ya məhsulu silmir. Sadəcə yeni Xülasə bölməsini, dinamik loqo dəyişməni və Supabase Storage qovluğunu əlavə edir.
          </p>
        </div>
      </div>

      {/* Step 1: Supabase Migration Script */}
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-xs font-bold font-mono">
                1
              </span>
              <h4 className="text-sm font-bold text-white">
                Supabase v2 Miqrasiyası (Cədvəl, Storage Bucket & Policy)
              </h4>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Supabase Dashboard-da SQL Editor bölməsinə yapışdırıb &quot;Run&quot; vurun:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(SUPABASE_MIGRATION_SQL, 'sql')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Kopyalandı!' : 'SQL Kodu Kopyala'}</span>
            </button>

            {isSupabaseConnected && (
              <button
                onClick={handleAutoCreateBucket}
                disabled={isCreatingBucket}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-zinc-700"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bucket-i Avtomatik Yoxla</span>
              </button>
            )}
          </div>
        </div>

        {bucketStatus && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono">
            {bucketStatus}
          </div>
        )}

        <div className="relative">
          <pre className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-64 leading-relaxed">
            {SUPABASE_MIGRATION_SQL}
          </pre>
        </div>
      </div>

      {/* Step 2: GitHub Push Instructions */}
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center text-xs font-bold font-mono">
                2
              </span>
              <h4 className="text-sm font-bold text-white">
                Dəyişiklikləri GitHub-a Push Edin
              </h4>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Bütün yeni fayllar və dəyişikliklər Git repozitoriyasına əlavə olunub və commit edilib.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(GIT_COMMANDS, 'git')}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-zinc-700"
          >
            {copiedGit ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedGit ? 'Kopyalandı!' : 'Əmrləri Kopyala'}</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs space-y-3">
          <div className="flex items-center gap-2 text-zinc-300 font-bold">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Terminalda icra ediləcək əmrlər:</span>
          </div>

          <pre className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-200 overflow-x-auto">
            {GIT_COMMANDS}
          </pre>
        </div>
      </div>

      {/* Step 3: How Auto-Update works for existing users */}
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <span className="w-6 h-6 rounded-lg bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center text-xs font-bold font-mono">
            3
          </span>
          <h4 className="text-sm font-bold text-white">
            Köhnə Proqramınız Necə Avtomatik Yenilənir?
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>1. GitHub və Hosting</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Kodu GitHub-a push etdikdə, Vercel / Netlify / Render və ya Cloudflare avtomatik olaraq layihəni yenidən yığır (Build) və 1 dəqiqə ərzində saytı canlı yeniləyir.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>2. Telefonlar (PWA Auto-Update)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              iPhone və Samsung telefonlarda quraşdırılmış tətbiq (PWA) arxa planda Service Worker vasitəsilə yeni versiyanı avtomatik yükləyir. Heç bir məlumat silinmir.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>3. Supabase Realtime</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Admin panelindən loqo və ya parametr dəyişdikdə, işçinin telefonundakı proqram səhifəni yeniləmədən dərhal yeni loqonu və məlumatları göstərir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
