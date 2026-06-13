import React, { useState, useRef } from 'react';
import {
  UploadCloud, FileText, Video, Music, Image as ImageIcon, File as FileIcon,
  ExternalLink, Trash2, Loader2
} from 'lucide-react';
import { uploadFile, createMediaFile, deleteMediaFile, deleteStorageFile } from '../../lib/supabase';

const FileTypeIcon = ({ mimeType }) => {
  if (!mimeType) return <FileIcon size={18} className="text-warm-500 flex-shrink-0" />;
  if (mimeType.includes('pdf'))   return <FileText size={18} className="text-red-400 flex-shrink-0" />;
  if (mimeType.includes('video')) return <Video size={18} className="text-purple-400 flex-shrink-0" />;
  if (mimeType.includes('audio')) return <Music size={18} className="text-green-400 flex-shrink-0" />;
  if (mimeType.includes('image')) return <ImageIcon size={18} className="text-blue-400 flex-shrink-0" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={18} className="text-blue-600 flex-shrink-0" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText size={18} className="text-orange-400 flex-shrink-0" />;
  return <FileIcon size={18} className="text-warm-500 flex-shrink-0" />;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Componente reutilizável de upload de arquivos para Supabase Storage.
 *
 * Props:
 *  - userId: string           → internal user UUID (para DB)
 *  - authUserId: string       → auth.uid() (para Storage path)
 *  - folder: string           → 'proposals' | 'contracts' | 'projects' | 'fiscal-notes'
 *  - entityId: string         → UUID da entidade pai
 *  - existingFiles: array     → lista de media_files já salvos
 *  - onFileAdded: (file) => void
 *  - onFileDeleted: (fileId) => void
 *  - compact: bool            → UI menor para uso inline
 */
export default function FileUploader({
  userId,
  authUserId,
  folder,
  entityId,
  existingFiles = [],
  onFileAdded,
  onFileDeleted,
  compact = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleUploadRef = React.useRef();
  React.useEffect(() => {
    handleUploadRef.current = handleUpload;
  });

  React.useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files = [];
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split('/')[1] || 'png';
            const pastedFile = new File([file], `colado-${Date.now()}.${ext}`, { type: file.type });
            files.push(pastedFile);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleUploadRef.current(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    for (const file of Array.from(files)) {
      setUploadPercent(15);
      try {
        const { data: uploadData, error: uploadErr } = await uploadFile(
          authUserId, folder, entityId, file
        );
        if (uploadErr) throw uploadErr;

        setUploadPercent(65);

        // Mapear folder para coluna FK
        const fkMap = {
          'proposals': 'proposal_id',
          'contracts': 'contract_id',
          'projects': 'project_id',
          'fiscal-notes': null,
          'tasks': 'task_id',
        };
        const fkCol = fkMap[folder];

        const { data: mediaFile, error: dbErr } = await createMediaFile(userId, {
          file_name: file.name,
          file_path: uploadData.path,
          file_url: uploadData.url,
          mime_type: file.type || null,
          file_size: file.size || null,
          ...(fkCol ? { [fkCol]: entityId } : {}),
        });

        if (dbErr) throw dbErr;
        setUploadPercent(100);
        if (onFileAdded) onFileAdded(mediaFile);
      } catch (err) {
        setError(`Erro ao fazer upload de "${file.name}": ${err.message || err}`);
      }
    }

    setUploading(false);
    setUploadPercent(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Remover "${file.file_name}"?`)) return;
    await deleteMediaFile(file.id);
    await deleteStorageFile(file.file_path);
    if (onFileDeleted) onFileDeleted(file.id);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${compact ? 'p-4' : 'p-6'}
          ${isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-warm-400/60 hover:border-brand-500/50 hover:bg-warm-200/50'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-blue-500" size={compact ? 20 : 28} />
            <p className="text-xs text-warm-500 font-medium">Enviando...</p>
            <div className="w-full max-w-xs bg-warm-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center gap-${compact ? '1' : '2'} text-center`}>
            <UploadCloud className="text-warm-600" size={compact ? 22 : 32} />
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-warm-500 font-medium`}>
              Arraste arquivos ou{' '}
              <span className="text-blue-600 underline">clique para selecionar</span>
            </p>
            {!compact && (
              <p className="text-[10px] text-warm-500">
                PDF, DOCX, imagens, vídeos, áudios — até 50 MB por arquivo
              </p>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* File list */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-warm-200/40 rounded-xl border border-warm-300/60 group"
            >
              <FileTypeIcon mimeType={file.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-warm-800">
                  {file.file_name}
                </p>
                {file.description && (
                  <p className="text-[10px] text-warm-500 truncate">{file.description}</p>
                )}
                {file.file_size && (
                  <p className="text-[10px] text-warm-400">{formatFileSize(file.file_size)}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-warm-300 rounded-lg"
                  title="Abrir arquivo"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={13} className="text-warm-500" />
                </a>
                <button
                  onClick={() => handleDeleteFile(file)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Remover arquivo"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
