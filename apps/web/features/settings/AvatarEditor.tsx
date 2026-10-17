'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ImagePlus, Minus, Plus, Trash2 } from 'lucide-react';

import { removeAvatar, requestAvatarUpload, setAvatar, uploadAvatarImage } from '@/api/profile';
import { Button } from '@/components/ui/button';
import {
  AVATAR_ACCEPTED_TYPES,
  AVATAR_MAX_SOURCE_BYTES,
  cropToAvatar,
} from '@/lib/avatar/cropImage';
import { toUserMessage } from '@/lib/errors';
import { useIsSocketConnected, useSetUser, useUser } from '@/store/selectors';

import { UserAvatar } from './UserAvatar';

type Phase =
  | { kind: 'idle' }
  | { kind: 'cropping'; src: string }
  | { kind: 'saving'; src: string; step: string }
  | { kind: 'removing' };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Pick a photo, frame it in a circle, upload only the cropped square.
 *
 *   1. pick: jpg / png / webp, at most 10 MB (checked before anything loads)
 *   2. crop: drag and zoom inside a circular cutout (react-easy-crop)
 *   3. save: the browser renders the framed square at 512 px, asks the
 *      server for a signed upload, uploads straight to Cloudinary, then
 *      tells the server to use it (the old upload is deleted there)
 *
 * "Remove photo" only removes an uploaded picture; a Google/GitHub one
 * stays and shows again.
 */
export function AvatarEditor() {
  const user = useUser();
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const areaRef = useRef<Area | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // The picked file lives in an object URL while cropping; free it after.
  const src = phase.kind === 'cropping' || phase.kind === 'saving' ? phase.src : null;

  useEffect(() => {
    if (!src) return;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    areaRef.current = pixels;
  }, []);

  function pickFile(file: File | undefined) {
    setError(null);

    if (!file) return;

    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a JPG, PNG or WebP image.');
      return;
    }

    if (file.size > AVATAR_MAX_SOURCE_BYTES) {
      setError('That image is larger than 10 MB. Choose a smaller one.');
      return;
    }

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    areaRef.current = null;
    setPhase({ kind: 'cropping', src: URL.createObjectURL(file) });
  }

  async function save() {
    if (phase.kind !== 'cropping' || !areaRef.current) return;

    const { src: imageSrc } = phase;

    setError(null);

    try {
      setPhase({ kind: 'saving', src: imageSrc, step: 'Preparing your photo…' });
      const image = await cropToAvatar(imageSrc, areaRef.current);

      setPhase({ kind: 'saving', src: imageSrc, step: 'Uploading…' });
      const upload = await requestAvatarUpload();
      const publicId = await uploadAvatarImage(upload, image);

      setPhase({ kind: 'saving', src: imageSrc, step: 'Saving…' });
      setUser(await setAvatar(publicId));

      setPhase({ kind: 'idle' });
    } catch (caught) {
      setError(toUserMessage(caught, 'Your photo couldn’t be saved. Try again.'));
      setPhase({ kind: 'cropping', src: imageSrc });
    }
  }

  async function remove() {
    setError(null);
    setPhase({ kind: 'removing' });

    try {
      setUser(await removeAvatar());
    } catch (caught) {
      setError(toUserMessage(caught, 'Your photo couldn’t be removed. Try again.'));
    } finally {
      setPhase({ kind: 'idle' });
    }
  }

  /* ── cropping ────────────────────────────────────────────────────────── */

  if (phase.kind === 'cropping' || phase.kind === 'saving') {
    const saving = phase.kind === 'saving';

    return (
      <div className="grid gap-4">
        <div className="bg-background relative h-72 overflow-hidden rounded-lg">
          <Cropper
            image={phase.src}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            classes={{ cropAreaClassName: 'cd-avatar-crop-area' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Minus aria-hidden="true" className="text-faint-foreground size-4" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={saving}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Zoom"
            className="accent-primary h-1 flex-1"
          />
          <Plus aria-hidden="true" className="text-faint-foreground size-4" />
        </div>

        <p className="text-muted-foreground text-(length:--cd-text-meta)">
          Drag to position, zoom to fit. Only the part inside the circle is
          uploaded.
        </p>

        {error ? (
          <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          {saving ? (
            <span role="status" className="text-muted-foreground mr-auto text-(length:--cd-text-ui)">
              {phase.step}
            </span>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => {
              setError(null);
              setPhase({ kind: 'idle' });
            }}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={saving || !isOnline} onClick={() => void save()}>
            Save photo
          </Button>
        </div>
      </div>
    );
  }

  /* ── idle ────────────────────────────────────────────────────────────── */

  const busy = phase.kind === 'removing';

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-5">
        <UserAvatar className="size-20 text-xl" />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !isOnline}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {user?.avatarPublicId ? 'Change photo' : 'Upload photo'}
          </Button>

          {user?.avatarPublicId ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !isOnline}
              onClick={() => void remove()}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 aria-hidden="true" />
              {busy ? 'Removing…' : 'Remove photo'}
            </Button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPTED_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            pickFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      <p className="text-muted-foreground text-(length:--cd-text-meta)">
        JPG, PNG or WebP, up to 10 MB.
        {user?.avatarUrl && user.avatarPublicId
          ? ' Removing it shows your Google/GitHub picture again.'
          : null}
      </p>

      {error ? (
        <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
