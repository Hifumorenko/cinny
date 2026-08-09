import React, {
  MouseEventHandler,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Text,
  Button,
  Icon,
  Icons,
  IconButton,
  Avatar,
  AvatarImage,
  AvatarFallback,
  config,
  Spinner,
  Menu,
  RectCords,
  PopOut,
  Checkbox,
  toRem,
  Scroll,
  Header,
  Line,
  Chip,
  color,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { Room } from 'matrix-js-sdk';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
  Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { useGlobalImagePacks, useRoomsImagePacks } from '../../../hooks/useImagePacks';
import { SequenceCardStyle } from '../styles.css';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  EmoteRoomsContent,
  ImagePack,
  ImageUsage,
  PackAddress,
  packAddressEqual,
} from '../../../plugins/custom-emoji';
import { LineClamp2 } from '../../../styles/Text.css';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { AccountDataEvent } from '../../../../types/matrix/accountData';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { stopPropagation } from '../../../utils/keyboard';

function GlobalPackSelector({
  packs,
  useAuthentication,
  onSelect,
}: {
  packs: ImagePack[];
  useAuthentication: boolean;
  onSelect: (addresses: PackAddress[]) => void;
}) {
  const mx = useMatrixClient();
  const roomToPacks = useMemo(() => {
    const rToP = new Map<string, ImagePack[]>();
    packs
      .filter((pack) => !pack.deleted)
      .forEach((pack) => {
        if (!pack.address) return;
        const pks = rToP.get(pack.address.roomId) ?? [];
        pks.push(pack);
        rToP.set(pack.address.roomId, pks);
      });
    return rToP;
  }, [packs]);

  const [selected, setSelected] = useState<PackAddress[]>([]);
  const toggleSelect = (address: PackAddress) => {
    setSelected((addresses) => {
      const newAddresses = addresses.filter((addr) => !packAddressEqual(addr, address));
      if (newAddresses.length !== addresses.length) {
        return newAddresses;
      }
      newAddresses.push(address);
      return newAddresses;
    });
  };

  const addSelected = (adds: PackAddress[]) => {
    setSelected((addresses) => {
      const newAddresses = Array.from(addresses);
      adds.forEach((address) => {
        if (newAddresses.find((addr) => packAddressEqual(addr, address))) {
          return;
        }
        newAddresses.push(address);
      });
      return newAddresses;
    });
  };

  const removeSelected = (adds: PackAddress[]) => {
    setSelected((addresses) => {
      const newAddresses = addresses.filter(
        (addr) => !adds.find((address) => packAddressEqual(addr, address))
      );
      return newAddresses;
    });
  };

  const hasSelected = selected.length > 0;
  return (
    <Box grow="Yes" direction="Column">
      <Header size="400" variant="Surface" style={{ padding: `0 ${config.space.S300}` }}>
        <Box grow="Yes">
          <Text size="L400" truncate>
            Room Packs
          </Text>
        </Box>
        <Box shrink="No">
          <Chip
            radii="Pill"
            variant={hasSelected ? 'Success' : 'SurfaceVariant'}
            outlined={hasSelected}
            onClick={() => onSelect(selected)}
          >
            <Text size="B300">{hasSelected ? 'Save' : 'Close'}</Text>
          </Chip>
        </Box>
      </Header>
      <Line variant="Surface" size="300" />
      <Box grow="Yes">
        <Scroll size="300" hideTrack visibility="Hover">
          <Box
            direction="Column"
            gap="400"
            style={{
              paddingLeft: config.space.S300,
              paddingTop: config.space.S300,
              paddingBottom: config.space.S300,
              paddingRight: config.space.S100,
            }}
          >
            {Array.from(roomToPacks.entries()).map(([roomId, roomPacks]) => {
              const room = mx.getRoom(roomId);
              if (!room) return null;
              const roomPackAddresses = roomPacks
                .map((pack) => pack.address)
                .filter((addr) => addr !== undefined);
              const allSelected = roomPackAddresses.every((addr) =>
                selected.find((address) => packAddressEqual(addr, address))
              );

              return (
                <Box key={roomId} direction="Column" gap="100">
                  <Box alignItems="Center">
                    <Box grow="Yes">
                      <Text size="L400">{room.name}</Text>
                    </Box>
                    <Box shrink="No">
                      <Chip
                        variant={allSelected ? 'Critical' : 'Surface'}
                        radii="Pill"
                        onClick={() => {
                          if (allSelected) {
                            removeSelected(roomPackAddresses);
                            return;
                          }
                          addSelected(roomPackAddresses);
                        }}
                      >
                        <Text size="B300">{allSelected ? 'Unselect All' : 'Select All'}</Text>
                      </Chip>
                    </Box>
                  </Box>
                  {roomPacks.map((pack) => {
                    const avatarMxc = pack.getAvatarUrl(ImageUsage.Emoticon);
                    const avatarUrl = avatarMxc
                      ? mxcUrlToHttp(mx, avatarMxc, useAuthentication)
                      : undefined;
                    const { address } = pack;
                    if (!address) return null;

                    const added = !!selected.find((addr) => packAddressEqual(addr, address));
                    return (
                      <SequenceCard
                        key={pack.id}
                        className={SequenceCardStyle}
                        variant={added ? 'Success' : 'SurfaceVariant'}
                        direction="Column"
                        gap="400"
                      >
                        <SettingTile
                          title={pack.meta.name ?? 'Unknown'}
                          description={<span className={LineClamp2}>{pack.meta.attribution}</span>}
                          before={
                            <Box alignItems="Center" gap="300">
                              <Avatar size="300" radii="300">
                                {avatarUrl ? (
                                  <AvatarImage style={{ objectFit: 'contain' }} src={avatarUrl} />
                                ) : (
                                  <AvatarFallback>
                                    <Icon size="400" src={Icons.Sticker} filled />
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </Box>
                          }
                          after={
                            <Checkbox
                              checked={added}
                              variant="Success"
                              onClick={() => toggleSelect(address)}
                            />
                          }
                        />
                      </SequenceCard>
                    );
                  })}
                </Box>
              );
            })}

            {roomToPacks.size === 0 && (
              <SequenceCard
                className={SequenceCardStyle}
                variant="SurfaceVariant"
                direction="Column"
                gap="400"
              >
                <Box
                  justifyContent="Center"
                  direction="Column"
                  gap="200"
                  style={{
                    padding: `${config.space.S700} ${config.space.S400}`,
                    maxWidth: toRem(300),
                    margin: 'auto',
                  }}
                >
                  <Text size="H5" align="Center">
                    No Packs
                  </Text>
                  <Text size="T200" align="Center">
                    Pack from rooms will appear here. You do not have any room with packs yet.
                  </Text>
                </Box>
              </SequenceCard>
            )}
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}

// No six-dot grip glyph in folds' icon set, so it's drawn by hand to match
// the fixed 24x24 viewBox every other `Icons.*` entry uses.
const gripIconSrc = () => (
  <>
    <circle cx="9" cy="6" r="1.5" fill="currentColor" />
    <circle cx="15" cy="6" r="1.5" fill="currentColor" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
    <circle cx="9" cy="18" r="1.5" fill="currentColor" />
    <circle cx="15" cy="18" r="1.5" fill="currentColor" />
  </>
);

// Reorders `addresses` by moving `sourceAddress` to just before/after
// `targetAddress`, per `edge`. Used both by drag-and-drop and (indirectly,
// via a computed swap) the move up/down buttons.
function reorderAddresses(
  addresses: PackAddress[],
  sourceAddress: PackAddress,
  targetAddress: PackAddress,
  edge: Edge
): PackAddress[] {
  const withoutSource = addresses.filter((addr) => !packAddressEqual(addr, sourceAddress));
  const targetIndex = withoutSource.findIndex((addr) => packAddressEqual(addr, targetAddress));
  if (targetIndex === -1) return addresses;
  const insertIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex;
  withoutSource.splice(insertIndex, 0, sourceAddress);
  return withoutSource;
}

// Highlights which side of the row a dragged pack would land on.
function edgeIndicatorShadow(edge: Edge | null): string | undefined {
  if (edge === 'top') return `inset 0 ${toRem(2)} 0 0 ${color.Primary.Main}`;
  if (edge === 'bottom') return `inset 0 -${toRem(2)} 0 0 ${color.Primary.Main}`;
  return undefined;
}

type PackRowReorder = {
  index: number;
  total: number;
  moving: boolean;
  onMove: (address: PackAddress, direction: -1 | 1) => void;
};

type PackRowProps = {
  pack: ImagePack;
  avatarUrl?: string;
  removed: boolean;
  applyingChanges: boolean;
  onRemove: (address: PackAddress) => void;
  onUndoRemove: (address: PackAddress) => void;
  onView: (pack: ImagePack) => void;
  // Only set for the already-favorited list — the pending-selection preview
  // list below it isn't reorderable until it's actually saved.
  reorder?: PackRowReorder;
};
function PackRow({
  pack,
  avatarUrl,
  removed,
  applyingChanges,
  onRemove,
  onUndoRemove,
  onView,
  reorder,
}: PackRowProps) {
  const { address } = pack;
  const targetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    if (!reorder || !address || removed) return undefined;
    const target = targetRef.current;
    const handle = handleRef.current;
    if (!target || !handle) return undefined;

    return combine(
      draggable({
        element: target,
        dragHandle: handle,
        getInitialData: () => ({ address }),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element: target,
        canDrop: ({ source }) => !packAddressEqual(source.data.address as PackAddress, address),
        getData: ({ input, element }) =>
          attachClosestEdge({ address }, { input, element, allowedEdges: ['top', 'bottom'] }),
        onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    );
  }, [reorder, address, removed]);

  if (!address) return null;

  return (
    <SequenceCard
      ref={targetRef}
      className={SequenceCardStyle}
      variant={removed ? 'Critical' : 'SurfaceVariant'}
      direction="Column"
      gap="400"
      style={{
        opacity: dragging ? 0.4 : undefined,
        boxShadow: edgeIndicatorShadow(closestEdge),
      }}
    >
      <SettingTile
        title={
          <span style={{ textDecoration: removed ? 'line-through' : undefined }}>
            {pack.meta.name ?? 'Unknown'}
          </span>
        }
        description={<span className={LineClamp2}>{pack.meta.attribution}</span>}
        before={
          <Box alignItems="Center" gap="300">
            {reorder && !removed && (
              <Box
                ref={handleRef}
                alignItems="Center"
                justifyContent="Center"
                style={{ cursor: 'grab', touchAction: 'none', color: color.Surface.OnContainer }}
              >
                <Icon src={gripIconSrc} size="100" />
              </Box>
            )}
            {reorder && !removed && (
              <Box direction="Column" gap="100">
                <IconButton
                  size="300"
                  radii="300"
                  variant="Secondary"
                  aria-label="Move Up"
                  onClick={() => reorder.onMove(address, -1)}
                  disabled={reorder.moving || reorder.index === 0}
                >
                  <Icon src={Icons.ChevronTop} size="50" />
                </IconButton>
                <IconButton
                  size="300"
                  radii="300"
                  variant="Secondary"
                  aria-label="Move Down"
                  onClick={() => reorder.onMove(address, 1)}
                  disabled={reorder.moving || reorder.index === reorder.total - 1}
                >
                  <Icon src={Icons.ChevronBottom} size="50" />
                </IconButton>
              </Box>
            )}
            {removed ? (
              <IconButton
                size="300"
                radii="Pill"
                variant="Critical"
                onClick={() => onUndoRemove(address)}
                disabled={applyingChanges}
              >
                <Icon src={Icons.Plus} size="100" />
              </IconButton>
            ) : (
              <IconButton
                size="300"
                radii="Pill"
                variant="Secondary"
                onClick={() => onRemove(address)}
                disabled={applyingChanges}
              >
                <Icon src={Icons.Cross} size="100" />
              </IconButton>
            )}
            <Avatar size="300" radii="300">
              {avatarUrl ? (
                <AvatarImage style={{ objectFit: 'contain' }} src={avatarUrl} />
              ) : (
                <AvatarFallback>
                  <Icon size="400" src={Icons.Sticker} filled />
                </AvatarFallback>
              )}
            </Avatar>
          </Box>
        }
        after={
          !removed && (
            <Button
              variant="Secondary"
              fill="Soft"
              size="300"
              radii="300"
              outlined
              onClick={() => onView(pack)}
            >
              <Text size="B300">View</Text>
            </Button>
          )
        }
      />
    </SequenceCard>
  );
}

type GlobalPacksProps = {
  onViewPack: (imagePack: ImagePack) => void;
  // The ancestor `Scroll` this list lives inside, so dragging a pack near
  // its top/bottom edge auto-scrolls the list instead of being stuck.
  scrollRef?: RefObject<HTMLDivElement>;
};
export function GlobalPacks({ onViewPack, scrollRef }: GlobalPacksProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const globalPacks = useGlobalImagePacks();
  const [menuCords, setMenuCords] = useState<RectCords>();

  const roomIds = useAtomValue(allRoomsAtom);
  const rooms = useMemo(() => {
    const rs: Room[] = [];
    roomIds.forEach((rId) => {
      const r = mx.getRoom(rId);
      if (r) rs.push(r);
    });
    return rs;
  }, [mx, roomIds]);
  const roomsImagePack = useRoomsImagePacks(rooms);
  const nonGlobalPacks = useMemo(
    () =>
      roomsImagePack.filter(
        (pack) => !globalPacks.find((p) => packAddressEqual(pack.address, p.address))
      ),
    [roomsImagePack, globalPacks]
  );

  const [selectedPacks, setSelectedPacks] = useState<PackAddress[]>([]);
  const [removedPacks, setRemovedPacks] = useState<PackAddress[]>([]);

  const unselectedGlobalPacks = useMemo(
    () =>
      nonGlobalPacks.filter(
        (pack) => !selectedPacks.find((addr) => packAddressEqual(pack.address, addr))
      ),
    [selectedPacks, nonGlobalPacks]
  );

  const handleRemove = (address: PackAddress) => {
    setRemovedPacks((addresses) => [...addresses, address]);
  };

  const handleUndoRemove = (address: PackAddress) => {
    setRemovedPacks((addresses) => addresses.filter((addr) => !packAddressEqual(addr, address)));
  };

  const handleSelected = (addresses: PackAddress[]) => {
    setMenuCords(undefined);
    if (addresses.length > 0) {
      setSelectedPacks((a) => [...addresses, ...a]);
    }
  };

  const [applyState, applyChanges] = useAsyncCallback(
    useCallback(async () => {
      const content =
        mx.getAccountData(AccountDataEvent.PoniesEmoteRooms)?.getContent<EmoteRoomsContent>() ?? {};
      const updatedContent: EmoteRoomsContent = JSON.parse(JSON.stringify(content));

      selectedPacks.forEach((addr) => {
        const roomsToState = updatedContent.rooms ?? {};
        const stateKeyToObj = roomsToState[addr.roomId] ?? {};
        stateKeyToObj[addr.stateKey] = {};
        roomsToState[addr.roomId] = stateKeyToObj;
        updatedContent.rooms = roomsToState;
      });

      removedPacks.forEach((addr) => {
        if (updatedContent.rooms?.[addr.roomId]?.[addr.stateKey]) {
          delete updatedContent.rooms?.[addr.roomId][addr.stateKey];
        }
      });

      await mx.setAccountData(AccountDataEvent.PoniesEmoteRooms, updatedContent);
    }, [mx, selectedPacks, removedPacks])
  );

  const resetChanges = useCallback(() => {
    setSelectedPacks([]);
    setRemovedPacks([]);
  }, []);

  useEffect(() => {
    if (applyState.status === AsyncStatus.Success) {
      resetChanges();
    }
  }, [applyState, resetChanges]);

  const handleSelectMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  // Reordering (move buttons or drag-and-drop) writes straight to account
  // data (no staging/Apply step, like the select/remove flow above) since
  // moving one pack is a complete, self-contained change on its own.
  const [movingAddress, setMovingAddress] = useState<PackAddress>();

  const persistOrder = useCallback(
    async (orderedAddresses: PackAddress[]) => {
      const content =
        mx.getAccountData(AccountDataEvent.PoniesEmoteRooms)?.getContent<EmoteRoomsContent>() ?? {};
      const updatedContent: EmoteRoomsContent = JSON.parse(JSON.stringify(content));

      orderedAddresses.forEach((addr, order) => {
        const roomsToState = updatedContent.rooms ?? {};
        const stateKeyToObj = roomsToState[addr.roomId] ?? {};
        stateKeyToObj[addr.stateKey] = { ...stateKeyToObj[addr.stateKey], order };
        roomsToState[addr.roomId] = stateKeyToObj;
        updatedContent.rooms = roomsToState;
      });

      await mx.setAccountData(AccountDataEvent.PoniesEmoteRooms, updatedContent);
    },
    [mx]
  );

  const handleMove = useCallback(
    async (address: PackAddress, direction: -1 | 1) => {
      const orderedAddresses = globalPacks
        .map((pack) => pack.address)
        .filter((addr): addr is PackAddress => !!addr);
      const index = orderedAddresses.findIndex((addr) => packAddressEqual(addr, address));
      const swapIndex = index + direction;
      if (index === -1 || swapIndex < 0 || swapIndex >= orderedAddresses.length) return;

      [orderedAddresses[index], orderedAddresses[swapIndex]] = [
        orderedAddresses[swapIndex],
        orderedAddresses[index],
      ];

      setMovingAddress(address);
      try {
        await persistOrder(orderedAddresses);
      } finally {
        setMovingAddress(undefined);
      }
    },
    [globalPacks, persistOrder]
  );

  const handleDrop = useCallback(
    async (sourceAddress: PackAddress, targetAddress: PackAddress, edge: Edge) => {
      if (packAddressEqual(sourceAddress, targetAddress)) return;
      const orderedAddresses = globalPacks
        .map((pack) => pack.address)
        .filter((addr): addr is PackAddress => !!addr);
      const reordered = reorderAddresses(orderedAddresses, sourceAddress, targetAddress, edge);

      setMovingAddress(sourceAddress);
      try {
        await persistOrder(reordered);
      } finally {
        setMovingAddress(undefined);
      }
    },
    [globalPacks, persistOrder]
  );

  useEffect(() => {
    const scrollElement = scrollRef?.current;
    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          const { dropTargets } = location.current;
          if (dropTargets.length === 0) return;
          const sourceAddress = source.data.address as PackAddress | undefined;
          const targetAddress = dropTargets[0].data.address as PackAddress | undefined;
          const edge = extractClosestEdge(dropTargets[0].data);
          if (!sourceAddress || !targetAddress || !edge) return;
          handleDrop(sourceAddress, targetAddress, edge);
        },
      }),
      ...(scrollElement ? [autoScrollForElements({ element: scrollElement })] : [])
    );
  }, [handleDrop, scrollRef]);

  const applyingChanges = applyState.status === AsyncStatus.Loading;
  const hasChanges = removedPacks.length > 0 || selectedPacks.length > 0;

  const getAvatarUrl = (pack: ImagePack) => {
    const avatarMxc = pack.getAvatarUrl(ImageUsage.Emoticon);
    return avatarMxc ? mxcUrlToHttp(mx, avatarMxc, useAuthentication) ?? undefined : undefined;
  };
  const isRemoved = (pack: ImagePack) =>
    !!pack.address && !!removedPacks.find((addr) => packAddressEqual(addr, pack.address));

  return (
    <>
      <Box direction="Column" gap="100">
        <Text size="L400">Favorite Packs</Text>
        <SequenceCard
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title="Select Pack"
            description="Pick emojis and stickers pack from rooms to use in all rooms."
            after={
              <>
                <Button
                  onClick={handleSelectMenu}
                  variant="Secondary"
                  fill="Soft"
                  size="300"
                  radii="300"
                  outlined
                >
                  <Text size="B300">Select</Text>
                </Button>
                <PopOut
                  anchor={menuCords}
                  position="Bottom"
                  align="End"
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuCords(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) =>
                          evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                        isKeyBackward: (evt: KeyboardEvent) =>
                          evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu
                        style={{
                          display: 'flex',
                          maxWidth: toRem(400),
                          width: '100vw',
                          maxHeight: toRem(500),
                        }}
                      >
                        <GlobalPackSelector
                          packs={unselectedGlobalPacks}
                          useAuthentication={useAuthentication}
                          onSelect={handleSelected}
                        />
                      </Menu>
                    </FocusTrap>
                  }
                />
              </>
            }
          />
        </SequenceCard>
        {globalPacks.map((pack, index) => (
          <PackRow
            key={pack.id}
            pack={pack}
            avatarUrl={getAvatarUrl(pack)}
            removed={isRemoved(pack)}
            applyingChanges={applyingChanges}
            onRemove={handleRemove}
            onUndoRemove={handleUndoRemove}
            onView={onViewPack}
            reorder={{
              index,
              total: globalPacks.length,
              moving: !!movingAddress,
              onMove: handleMove,
            }}
          />
        ))}
        {nonGlobalPacks
          .filter((pack) => !!selectedPacks.find((addr) => packAddressEqual(pack.address, addr)))
          .map((pack) => (
            <PackRow
              key={pack.id}
              pack={pack}
              avatarUrl={getAvatarUrl(pack)}
              removed={isRemoved(pack)}
              applyingChanges={applyingChanges}
              onRemove={handleRemove}
              onUndoRemove={handleUndoRemove}
              onView={onViewPack}
            />
          ))}
      </Box>
      {hasChanges && (
        <Menu
          style={{
            position: 'sticky',
            padding: config.space.S200,
            paddingLeft: config.space.S400,
            bottom: config.space.S400,
            left: config.space.S400,
            right: 0,
            zIndex: 1,
          }}
          variant="Success"
        >
          <Box alignItems="Center" gap="400">
            <Box grow="Yes" direction="Column">
              {applyState.status === AsyncStatus.Error ? (
                <Text size="T200">
                  <b>Failed to apply changes! Please try again.</b>
                </Text>
              ) : (
                <Text size="T200">
                  <b>Changes saved! Apply when ready.</b>
                </Text>
              )}
            </Box>
            <Box shrink="No" gap="200">
              <Button
                size="300"
                variant="Success"
                fill="None"
                radii="300"
                disabled={applyingChanges}
                onClick={resetChanges}
              >
                <Text size="B300">Reset</Text>
              </Button>
              <Button
                size="300"
                variant="Success"
                radii="300"
                disabled={applyingChanges}
                before={applyingChanges && <Spinner variant="Success" fill="Solid" size="100" />}
                onClick={applyChanges}
              >
                <Text size="B300">Apply Changes</Text>
              </Button>
            </Box>
          </Box>
        </Menu>
      )}
    </>
  );
}
