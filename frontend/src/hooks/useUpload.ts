'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPresignedUrl, confirmUpload } from '@/lib/api/endpoints';
import type { Document } from '@/types';

export type UploadStatus =
  | 'idle'
  | 'getting-url'
  | 'uploading'
  | 'confirming'
  | 'complete'
  | 'error';

export interface UseUploadReturn {
  upload: (file: File) => Promise<Document | null>;
  progress: number;
  status: UploadStatus;
  error: string | null;
  reset: () => void;
  document: Document | null;
  abort: () => void;
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

function getFileType(file: File): 'pdf' | 'docx' | 'image' | null {
  if (ALLOWED_MIME_TYPES[file.type]) {
    return ALLOWED_MIME_TYPES[file.type];
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 'image';
  return null;
}

export function useUpload(subjectId: string): UseUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);

  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const currentDocIdRef = useRef<string | null>(null);

  // Abort any in-flight upload on unmount
  useEffect(() => {
    return () => {
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    currentDocIdRef.current = null;
    setStatus('idle');
    setProgress(0);
    setError(null);
    setDocument(null);
  }, []);

  const abort = useCallback(() => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    if (currentDocIdRef.current) {
      confirmUpload(currentDocIdRef.current, false).catch(() => {});
      currentDocIdRef.current = null;
    }
    setStatus('error');
    setError('Upload was cancelled');
    setProgress(0);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<Document | null> => {
      // 1. Validation
      if (!file) {
        setError('No file provided');
        setStatus('error');
        return null;
      }

      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = `File size exceeds the 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
        setError(errorMsg);
        setStatus('error');
        return null;
      }

      const fileType = getFileType(file);
      if (!fileType) {
        const errorMsg = 'Unsupported file format. Please upload a PDF, DOCX, PNG, or JPG file.';
        setError(errorMsg);
        setStatus('error');
        return null;
      }

      setError(null);
      setProgress(0);
      setDocument(null);
      setStatus('getting-url');

      let docId: string | null = null;

      try {
        // 2. Request presigned URL from backend
        const presignedResponse = await getPresignedUrl(
          subjectId,
          file.name,
          fileType,
          file.size
        );

        const uploadUrl =
          presignedResponse.upload_url ||
          (presignedResponse as unknown as { uploadUrl?: string }).uploadUrl;
        docId =
          presignedResponse.document_id ||
          (presignedResponse as unknown as { documentId?: string; fileKey?: string }).documentId ||
          `doc-${Date.now()}`;

        currentDocIdRef.current = docId;

        if (!uploadUrl) {
          throw new Error('Server did not return a valid upload URL');
        }

        // 3. Upload file with XMLHttpRequest for granular progress tracking
        setStatus('uploading');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrRef.current = xhr;

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.min(
                95,
                Math.round((event.loaded / event.total) * 100)
              );
              setProgress(percent);
            }
          };

          xhr.onload = () => {
            activeXhrRef.current = null;
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(98);
              resolve();
            } else {
              reject(
                new Error(`Upload failed with status code ${xhr.status}: ${xhr.statusText}`)
              );
            }
          };

          xhr.onerror = () => {
            activeXhrRef.current = null;
            reject(new Error('Network error occurred during file upload'));
          };

          xhr.onabort = () => {
            activeXhrRef.current = null;
            reject(new Error('Upload was aborted'));
          };

          // Handle S3 presigned POST (with fields) or PUT
          const fields = presignedResponse.fields;
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

        // 4. Confirm upload completion with backend
        setStatus('confirming');
        setProgress(99);

        const confirmedDoc = await confirmUpload(docId, true);
        currentDocIdRef.current = null;

        const finalDoc: Document = confirmedDoc || {
          id: docId,
          subject_id: subjectId,
          filename: file.name,
          file_type: fileType,
          file_url: uploadUrl.split('?')[0],
          file_size: file.size,
          status: 'uploaded',
          created_at: new Date().toISOString(),
        };

        setProgress(100);
        setStatus('complete');
        setDocument(finalDoc);
        return finalDoc;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during upload';

        if (docId) {
          confirmUpload(docId, false).catch(() => {});
          currentDocIdRef.current = null;
        }

        setError(errorMsg);
        setStatus('error');
        return null;
      }
    },
    [subjectId]
  );

  return {
    upload,
    progress,
    status,
    error,
    reset,
    document,
    abort,
  };
}
