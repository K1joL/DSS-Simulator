import { useMemo, useRef, useState } from 'react';
import { JsonConfigSerializer } from '../../infrastructure/serialization/JsonConfigSerializer';

export function useConfigImportExport(config: unknown, setConfig: (updater: any) => void) {
  const serializer = useMemo(() => new JsonConfigSerializer(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>('');
  const exportConfig = () => { serializer.download('experiment-config.json', config); setStatus('Конфигурация экспортирована в JSON'); };
  const openImportDialog = () => { inputRef.current?.click(); };
  const onFileSelected = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = serializer.parse<any>(text);
      setConfig(() => parsed);
      setStatus('Конфигурация успешно импортирована');
    } catch (error) { setStatus(`Ошибка импорта: ${(error as Error).message}`); }
  };
  return { inputRef, status, exportConfig, openImportDialog, onFileSelected };
}
