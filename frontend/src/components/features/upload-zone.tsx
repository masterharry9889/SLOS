'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { getPresignedUrl, confirmUpload } from '@/lib/api/endpoints';
import type { Document } from '@/types';

export interface UploadZoneProps {
  subjectId: string;
  onUploadComplete?: (document: Document) => void;
  onError?: (message: string) => void;
  onAllUploadsComplete?: (documents: Document[]) => void;
  className?: string;
  maxFiles?: number;
  disabled?: boolean;
}

export type FileUploadStatus =
  | 'queued'
  | 'getting-url'
  | 'uploading'
  | 'confirming'
  | 'complete'
  | 'error';

export interface UploadQueueItem {
  id: string;
  file: File;
  fileType: 'pdf' | 'docx' | 'image';
  progress: number;
  status: FileUploadStatus;
  error?: string;
  document?: Document;
  xhr?: XMLHttpRequest;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES: Record<string, 'pdf' | 'docx' | 'image'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
};

function resolveFileType(file: File): 'pdf' | 'docx' | 'image' | null {
  if (ALLOWED_MIME_TYPES[file.type]) {
    return ALLOWED_MIME_TYPES[file.type];
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 'image';
  return null;
}

function getFileIcon(type: 'pdf' | 'docx' | 'image') {
  if (type === 'image') return ImageIcon;
  if (type === 'pdf' || type === 'docx') return FileText;
  return File;
}

export function UploadZone({
  subjectId,
  onUploadComplete,
  onError,
  onAllUploadsComplete,
  className,
  maxFiles = 10,
  disabled = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileList, setFileList] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to update a specific file item in queue
  const updateFileItem = useCallback(
    (id: string, updates: Partial<UploadQueueItem>) => {
      setFileList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  // Execute the 3-step upload flow for a single file
  const startUpload = useCallback(
    async (item: UploadQueueItem) => {
      const { id, file, fileType } = item;
      updateFileItem(id, { status: 'getting-url', progress: 5, error: undefined });

      let docId: string | null = null;
      let xhrInstance: XMLHttpRequest | null = null;

      try {
        // Step 1: Request presigned URL from backend
        const presigned = await getPresignedUrl(
          subjectId,
          file.name,
          fileType,
          file.size
        );

        const uploadUrl =
          presigned.upload_url ||
          (presigned as unknown as { uploadUrl?: string }).uploadUrl;

        docId =
          presigned.document_id ||
          (presigned as unknown as { documentId?: string }).documentId ||
          `doc-${Date.now()}`;

        if (!uploadUrl) {
          throw new Error('Failed to obtain a valid storage upload URL');
        }

        // Step 2: Perform direct file upload with XMLHttpRequest
        updateFileItem(id, { status: 'uploading', progress: 10 });

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrInstance = xhr;
          updateFileItem(id, { xhr });

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.min(
                95,
                Math.round((event.loaded / event.total) * 100)
              );
              updateFileItem(id, { progress: percent });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateFileItem(id, { progress: 98 });
              resolve();
            } else {
              reject(
                new Error(
                  `Upload request failed with status code ${xhr.status}: ${xhr.statusText}`
                )
              );
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network connectivity error during file transfer'));
          };

          xhr.onabort = () => {
            reject(new Error('File upload was aborted'));
          };

          const fields = presigned.fields;
          if (fields && Object.keys(fields).length > 0) {
            const formData = new FormData();
            Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
            formData.append('file', file);
            xhr.open('POST', uploadUrl);
            xhr.send(formData);
          } else {
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
          }
        });

        // Step 3: Confirm upload with backend
        updateFileItem(id, { status: 'confirming', progress: 99 });

        const confirmedDocument = await confirmUpload(docId, true);

        const finalDocument: Document = confirmedDocument || {
          id: docId,
          subject_id: subjectId,
          filename: file.name,
          file_type: fileType,
          file_url: uploadUrl.split('?')[0],
          file_size: file.size,
          status: 'uploaded',
          created_at: new Date().toISOString(),
        };

        updateFileItem(id, {
          status: 'complete',
          progress: 100,
          document: finalDocument,
          xhr: undefined,
        });

        onUploadComplete?.(finalDocument);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Upload failed unexpectedly';

        if (docId) {
          confirmUpload(docId, false).catch(() => {});
        }

        updateFileItem(id, {
          status: 'error',
          error: errorMsg,
          xhr: undefined,
        });

        onError?.(errorMsg);
      }
    },
    [subjectId, updateFileItem, onUploadComplete, onError]
  );

  // Validate and enqueue new files
  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (disabled) return;

      const newItems: UploadQueueItem[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (newItems.length + fileList.length >= maxFiles) {
          onError?.(`Maximum limit of ${maxFiles} files reached.`);
          break;
        }

        // Validate file size (max 50MB)
        if (file.size > MAX_FILE_SIZE) {
          const msg = `"${file.name}" exceeds the 50MB file size limit (${formatBytes(
            file.size
          )}).`;
          onError?.(msg);
          continue;
        }

        // Validate file type
        const type = resolveFileType(file);
        if (!type) {
          const msg = `"${file.name}" has an unsupported format. Please upload PDF, DOCX, PNG, or JPG files.`;
          onError?.(msg);
          continue;
        }

        const item: UploadQueueItem = {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          file,
          fileType: type,
          progress: 0,
          status: 'queued',
        };

        newItems.push(item);
      }

      if (newItems.length > 0) {
        setFileList((prev) => [...prev, ...newItems]);
        // Trigger uploads for newly added files
        newItems.forEach((item) => {
          startUpload(item);
        });
      }
    },
    [disabled, fileList.length, maxFiles, onError, startUpload]
  );

  // Drag and drop event handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) {
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    setFileList((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.xhr) {
        item.xhr.abort();
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const retryItem = (item: UploadQueueItem) => {
    startUpload(item);
  };

  const clearCompleted = () => {
    setFileList((prev) => prev.filter((i) => i.status !== 'complete'));
  };

  const isUploadingAny = fileList.some(
    (i) =>
      i.status === 'uploading' ||
      i.status === 'getting-url' ||
      i.status === 'confirming'
  );

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset input to allow re-upload of same file
          }
        }}
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          'group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01] shadow-md shadow-primary/10'
            : 'border-border bg-card/60 hover:border-primary/60 hover:bg-muted/40',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        {/* Animated Upload Icon */}
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background shadow-xs transition-transform duration-300 group-hover:scale-110 mb-4',
            isDragging && 'scale-125 border-primary text-primary bg-primary/10'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary',
              isDragging && 'text-primary animate-bounce'
            )}
          />
        </div>

        <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          {isDragging ? 'Drop files here to upload' : 'Click to upload or drag & drop'}
        </h3>

        <p className="max-w-md text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Upload your syllabus, lecture notes, textbook chapters, or exam documents
        </p>

        {/* Badges for supported formats */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            PDF
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            DOCX
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            PNG / JPG
          </span>
          <span className="text-[11px] text-muted-foreground">
            Up to 50MB per file
          </span>
        </div>
      </div>

      {/* File Upload List */}
      {fileList.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upload Queue
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {fileList.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                <span>Add more</span>
              </button>

              {fileList.some((i) => i.status === 'complete') && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-2 cursor-pointer"
                >
                  Clear completed
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-border/60 space-y-1">
            {fileList.map((item) => {
              const Icon = getFileIcon(item.fileType);

              return (
                <div key={item.id} className="pt-3 first:pt-1 pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatBytes(item.file.size)} •{' '}
                          <span className="uppercase">{item.fileType}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status indicator */}
                      {item.status === 'complete' && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Uploaded</span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => retryItem(item)}
                            title="Retry upload"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex items-center gap-1 text-destructive text-xs font-semibold">
                            <AlertCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Failed</span>
                          </div>
                        </div>
                      )}

                      {(item.status === 'uploading' ||
                        item.status === 'getting-url' ||
                        item.status === 'confirming') && (
                        <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>{item.progress}%</span>
                        </div>
                      )}

                      {/* Remove / Cancel button */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        title={
                          item.status === 'uploading' ? 'Cancel upload' : 'Remove'
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (when active or error) */}
                  {item.status !== 'complete' && (
                    <div className="mt-2.5 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full transition-all duration-300 rounded-full',
                            item.status === 'error'
                              ? 'bg-destructive'
                              : 'bg-primary'
                          )}
                          style={{ width: `${Math.max(item.progress, 4)}%` }}
                        />
                      </div>
                      {item.error && (
                        <p className="text-[11px] text-destructive leading-tight">
                          {item.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
