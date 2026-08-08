import React, { CSSProperties } from 'react';
import { Badge, Box, Text, Tooltip, TooltipProvider } from 'folds';
import { EmojiBoardTab } from '../types';

const styles: CSSProperties = {
  cursor: 'pointer',
};

const disabledStyles: CSSProperties = {
  cursor: 'not-allowed',
  opacity: 0.5,
};

export function EmojiBoardTabs({
  tab,
  onTabChange,
  showGif,
  gifEnabled,
}: {
  tab: EmojiBoardTab;
  onTabChange: (tab: EmojiBoardTab) => void;
  showGif?: boolean;
  gifEnabled?: boolean;
}) {
  return (
    <Box gap="100">
      <Badge
        style={styles}
        as="button"
        variant="Secondary"
        fill={tab === EmojiBoardTab.Sticker ? 'Solid' : 'None'}
        size="500"
        onClick={() => onTabChange(EmojiBoardTab.Sticker)}
      >
        <Text as="span" size="L400">
          Sticker
        </Text>
      </Badge>
      <Badge
        style={styles}
        as="button"
        variant="Secondary"
        fill={tab === EmojiBoardTab.Emoji ? 'Solid' : 'None'}
        size="500"
        onClick={() => onTabChange(EmojiBoardTab.Emoji)}
      >
        <Text as="span" size="L400">
          Emoji
        </Text>
      </Badge>
      {showGif &&
        (gifEnabled ? (
          <Badge
            style={styles}
            as="button"
            variant="Secondary"
            fill={tab === EmojiBoardTab.Gif ? 'Solid' : 'None'}
            size="500"
            onClick={() => onTabChange(EmojiBoardTab.Gif)}
          >
            <Text as="span" size="L400">
              GIF
            </Text>
          </Badge>
        ) : (
          <TooltipProvider
            delay={200}
            position="Top"
            tooltip={
              <Tooltip id="emoji-board-gif-disabled">
                <Text size="T300">Add a Klipy API key in Settings → General to use GIFs.</Text>
              </Tooltip>
            }
          >
            {(ref) => (
              <Badge
                ref={ref}
                style={disabledStyles}
                as="button"
                variant="Secondary"
                fill="None"
                size="500"
                aria-disabled
                aria-describedby="emoji-board-gif-disabled"
                onClick={(evt: React.MouseEvent) => evt.preventDefault()}
              >
                <Text as="span" size="L400">
                  GIF
                </Text>
              </Badge>
            )}
          </TooltipProvider>
        ))}
    </Box>
  );
}
