import React, { useCallback } from 'react';
import { Box, Text, Switch, Button, color, Spinner } from 'folds';
import { IPusherRequest } from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { SystemNotificationModeSelector } from './SystemNotificationModeSelector';
import { useNotificationPermission } from '../../../hooks/usePermission';
import {
  isDesktopApp,
  requestSystemNotificationPermission,
  showSystemNotification,
} from '../../../utils/systemNotifications';
import { useEmailNotifications } from '../../../hooks/useEmailNotifications';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

function EmailNotification() {
  const mx = useMatrixClient();
  const [result, refreshResult] = useEmailNotifications();

  const [setState, setEnable] = useAsyncCallback(
    useCallback(
      async (email: string, enable: boolean) => {
        if (enable) {
          await mx.setPusher({
            kind: 'email',
            app_id: 'm.email',
            pushkey: email,
            app_display_name: 'Email Notifications',
            device_display_name: email,
            lang: 'en',
            data: {
              brand: 'Cinny',
            },
            append: true,
          });
          return;
        }
        await mx.setPusher({
          pushkey: email,
          app_id: 'm.email',
          kind: null,
        } as unknown as IPusherRequest);
      },
      [mx]
    )
  );

  const handleChange = (value: boolean) => {
    if (result && result.email) {
      setEnable(result.email, value).then(() => {
        refreshResult();
      });
    }
  };

  return (
    <SettingTile
      title="Email Notification"
      description={
        <>
          {result && !result.email && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              Your account does not have any email attached.
            </Text>
          )}
          {result && result.email && <>Send notification to your email. {`("${result.email}")`}</>}
          {result === null && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              Unexpected Error!
            </Text>
          )}
          {result === undefined && 'Send notification to your email.'}
        </>
      }
      after={
        <>
          {setState.status !== AsyncStatus.Loading &&
            typeof result === 'object' &&
            result?.email && <Switch value={result.enabled} onChange={handleChange} />}
          {(setState.status === AsyncStatus.Loading || result === undefined) && (
            <Spinner variant="Secondary" />
          )}
        </>
      }
    />
  );
}

export function SystemNotification() {
  const notifPermission = useNotificationPermission();
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [testState, sendTest] = useAsyncCallback(
    useCallback(
      () =>
        showSystemNotification(
          'Cinny',
          { body: 'Desktop notifications are working.', silent: true },
          () => undefined,
          { kind: 'test' }
        ),
      []
    )
  );

  const requestNotificationPermission = () => {
    requestSystemNotificationPermission().catch(console.error);
  };
  let permissionDescription = 'Notifications are not supported by the system.';
  if (isDesktopApp()) {
    permissionDescription = 'Allow notifications for Cinny in your system notification settings.';
  } else if ('Notification' in window) {
    permissionDescription =
      'Notification permission is blocked. Please allow notification permission from browser address bar.';
  }

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">System</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Notification Mode"
          description={
            <>
              Repeated alerts from the same conversation are limited to once every five minutes
              until you read it.
              {showNotifications && notifPermission === 'denied' && (
                <Text as="span" style={{ color: color.Critical.Main }} size="T200">
                  {' '}
                  {permissionDescription}
                </Text>
              )}
            </>
          }
          after={<SystemNotificationModeSelector />}
        >
          {showNotifications && notifPermission === 'prompt' && (
            <Box>
              <Button size="300" radii="300" onClick={requestNotificationPermission}>
                <Text size="B300">Allow desktop notifications</Text>
              </Button>
            </Box>
          )}
          {showNotifications && (isDesktopApp() || notifPermission === 'granted') && (
            <Box direction="Column" gap="100">
              <Box>
                <Button
                  size="300"
                  radii="300"
                  disabled={testState.status === AsyncStatus.Loading}
                  onClick={() => sendTest().catch(() => undefined)}
                >
                  <Text size="B300">Send test notification</Text>
                </Button>
              </Box>
              {testState.status === AsyncStatus.Error && (
                <Text as="span" size="T200" style={{ color: color.Critical.Main }} role="alert">
                  Could not send notification: {String(testState.error)}
                </Text>
              )}
              {testState.status === AsyncStatus.Success && (
                <Text as="span" size="T200" role="status">
                  Test sent. If no banner appeared, check your system notification settings and Do
                  Not Disturb.
                </Text>
              )}
            </Box>
          )}
        </SettingTile>
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <EmailNotification />
      </SequenceCard>
    </Box>
  );
}
