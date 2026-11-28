import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Box, Switch, Text } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCardStyle } from '../styles.css';

export function Desktop() {
  const [quitOnClose, setQuitOnClose] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let disposed = false;
    invoke<boolean>('get_quit_on_close')
      .then((value) => {
        if (!disposed) {
          setQuitOnClose(value);
          setBusy(false);
        }
      })
      .catch(() => {
        if (!disposed) setError('Could not load desktop settings. Reopen settings to try again.');
      });
    return () => {
      disposed = true;
    };
  }, []);

  const handleChange = (enabled: boolean) => {
    setBusy(true);
    setError(undefined);
    invoke('set_quit_on_close', { enabled })
      .then(() => setQuitOnClose(enabled))
      .catch(() => setError('Could not save desktop settings. Please try again.'))
      .finally(() => setBusy(false));
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Desktop</Text>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Quit when closing the window"
          description="Exit Cinny when you close its window. When off, Cinny keeps running in the tray."
          after={
            <Switch variant="Primary" value={quitOnClose} disabled={busy} onChange={handleChange} />
          }
        >
          {error && (
            <Text size="T200" role="alert">
              {error}
            </Text>
          )}
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
