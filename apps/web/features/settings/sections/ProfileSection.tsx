'use client';

import { useState } from 'react';

import { updateProfile } from '@/api/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toUserMessage } from '@/lib/errors';
import { useIsSocketConnected, useSetUser, useUser } from '@/store/selectors';

import { AvatarEditor } from '../AvatarEditor';
import { OfflineNote, SectionHeader } from '../SettingsModal';

const NAME_MAX_LENGTH = 100;

export function ProfileSection() {
  const user = useUser();
  const setUser = useSetUser();
  const isOnline = useIsSocketConnected();

  const saved = user?.displayName ?? '';
  const [name, setName] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const trimmed = name.trim();
  const changed = trimmed !== saved;
  const canSave = isOnline && changed && trimmed.length > 0 && !saving;

  async function saveName() {
    setError(null);
    setSaving(true);

    try {
      const profile = await updateProfile({ displayName: trimmed });
      setUser(profile);
      setName(profile.displayName ?? '');
      setJustSaved(true);
    } catch (caught) {
      setError(toUserMessage(caught, 'Your name couldn’t be saved. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-7">
      <SectionHeader
        title="Profile"
        description="How you appear in Cadence."
      />

      <section aria-labelledby="settings-photo" className="grid gap-3">
        <h3 id="settings-photo" className="text-foreground text-(length:--cd-text-ui) font-medium">
          Photo
        </h3>
        <AvatarEditor />
      </section>

      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) void saveName();
        }}
      >
        <label
          htmlFor="settings-display-name"
          className="text-foreground text-(length:--cd-text-ui) font-medium"
        >
          Display name
        </label>

        <div className="flex gap-2">
          <Input
            id="settings-display-name"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            aria-invalid={trimmed.length === 0 ? true : undefined}
            aria-describedby="settings-name-help"
            onChange={(event) => {
              setName(event.target.value);
              setJustSaved(false);
            }}
            className="h-9 min-w-0 max-w-sm flex-1 text-(length:--cd-text-control)"
          />
          <Button type="submit" size="sm" className="h-9 shrink-0" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <p id="settings-name-help" className="text-muted-foreground text-(length:--cd-text-meta)">
          {trimmed.length === 0
            ? 'Your name can’t be empty.'
            : justSaved && !changed
              ? 'Saved.'
              : 'Shown in your greeting and on your profile.'}
        </p>

        {error ? (
          <p role="alert" className="text-destructive text-(length:--cd-text-ui)">
            {error}
          </p>
        ) : null}

        {!isOnline ? <OfflineNote /> : null}
      </form>
    </div>
  );
}
