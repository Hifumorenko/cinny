import React, { MouseEventHandler, useState } from 'react';
import { atom, useAtom } from 'jotai';
import { Box, Button, config, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { settingsAtom } from '../../../state/settings';
import { stopPropagation } from '../../../utils/keyboard';

const modes = [
  { label: 'Desktop + audio', desktop: true, audio: true },
  { label: 'Audio only', desktop: false, audio: true },
  { label: 'Desktop only', desktop: true, audio: false },
  { label: 'No notifications', desktop: false, audio: false },
] as const;

type SystemNotificationMode = typeof modes[number];

const systemNotificationModeAtom = atom(
  (get) => {
    const settings = get(settingsAtom);
    return (
      modes.find(
        (mode) =>
          mode.desktop === settings.showNotifications &&
          mode.audio === settings.isNotificationSounds
      ) ?? modes[0]
    );
  },
  (get, set, mode: SystemNotificationMode) => {
    set(settingsAtom, {
      ...get(settingsAtom),
      showNotifications: mode.desktop,
      isNotificationSounds: mode.audio,
    });
  }
);

export function SystemNotificationModeSelector() {
  const [selected, setSelected] = useAtom(systemNotificationModeAtom);
  const [menuCords, setMenuCords] = useState<RectCords>();
  const handleMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    setMenuCords(event.currentTarget.getBoundingClientRect());
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        aria-label={`Notification mode: ${selected.label}`}
        aria-haspopup="menu"
        aria-expanded={!!menuCords}
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text size="T300">{selected.label}</Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (event: KeyboardEvent) =>
                event.key === 'ArrowDown' || event.key === 'ArrowRight',
              isKeyBackward: (event: KeyboardEvent) =>
                event.key === 'ArrowUp' || event.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {modes.map((mode) => (
                  <MenuItem
                    key={mode.label}
                    size="300"
                    variant={mode === selected ? 'Primary' : 'Surface'}
                    radii="300"
                    role="menuitemradio"
                    aria-checked={mode === selected}
                    onClick={() => {
                      setSelected(mode);
                      setMenuCords(undefined);
                    }}
                  >
                    <Text size="T300">{mode.label}</Text>
                  </MenuItem>
                ))}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}
