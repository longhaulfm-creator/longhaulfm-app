import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getVersion } from '@tauri-apps/api/app'; // Tauri built-in helper
import { platform } from '@tauri-apps/plugin-os'; // To detect Android vs iOS

export function useUpdateCheck() {
  const [updateData, setUpdateData] = useState<{
    version: string;
    url: string;
    notes: string;
    required: boolean;
  } | null>(null);

  useEffect(() => {
    async function checkVersion() {
      const currentPlatform = platform(); // returns 'android', 'ios', etc.
      const currentVersion = await getVersion();

      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('platform', currentPlatform)
        .single();

      if (!error && data) {
        // Simple semantic version comparison logic (1.0.1 > 1.0.0)
        if (isNewerVersion(data.latest_version, currentVersion)) {
          setUpdateData({
            version: data.latest_version,
            url: data.download_url,
            notes: data.release_notes,
            required: data.is_required
          });
        }
      }
    }

    checkVersion();
  }, []);

  return { updateData, dismiss: () => setUpdateData(null) };
}

// Simple helper to compare version strings
function isNewerVersion(latest: string, current: string) {
  return latest.localeCompare(current, undefined, { numeric: true, sensitivity: 'base' }) > 0;
}