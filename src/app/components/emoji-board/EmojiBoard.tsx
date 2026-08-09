import React, {
  ChangeEventHandler,
  FocusEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Box, config, Icons, Scroll, toRem } from 'folds';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { Room } from 'matrix-js-sdk';
import { atom, PrimitiveAtom, useAtom, useSetAtom } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { IEmoji, emojiGroups, emojis } from '../../plugins/emoji';
import { useEmojiGroupLabels } from './useEmojiGroupLabels';
import { useEmojiGroupIcons } from './useEmojiGroupIcons';
import { preventScrollWithArrowKey, stopPropagation } from '../../utils/keyboard';
import { useRelevantImagePacks } from '../../hooks/useImagePacks';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../hooks/useRecentEmoji';
import { isUserId, mxcUrlToHttp } from '../../utils/matrix';
import { editableActiveElement, targetFromEvent } from '../../utils/dom';
import { useAsyncSearch, UseAsyncSearchOptions } from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { useThrottle } from '../../hooks/useThrottle';
import { addRecentEmoji } from '../../plugins/recent-emoji';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ImagePack, ImageUsage, PackImageReader } from '../../plugins/custom-emoji';
import { getEmoticonSearchStr } from '../../plugins/utils';
import {
  SearchInput,
  EmojiBoardTabs,
  SidebarStack,
  SidebarDivider,
  Sidebar,
  NoStickerPacks,
  createPreviewDataAtom,
  Preview,
  PreviewData,
  EmojiItem,
  StickerItem,
  CustomEmojiItem,
  ImageGroupIcon,
  GroupIcon,
  getEmojiItemInfo,
  EmojiGroup,
  EmojiBoardLayout,
} from './components';
import { EmojiBoardTab, EmojiType } from './types';
import { VirtualTile } from '../virtualizer';
import { GifContent } from '../gif-board';
import { KlipyGif } from '../../plugins/klipy';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

const RECENT_GROUP_ID = 'recent_group';
const SEARCH_GROUP_ID = 'search_group';

// Module-level (not React state) so a user-picked board size survives the
// board unmounting on close and remounting fresh on the next open — it only
// needs to live for the app session, not be reactive.
let savedBoardSize: { width: string; height: string } | null = null;

type EmojiGroupItem = {
  id: string;
  name: string;
  items: Array<IEmoji | PackImageReader>;
};
type StickerGroupItem = {
  id: string;
  name: string;
  items: Array<PackImageReader>;
};

const useGroups = (
  tab: EmojiBoardTab,
  imagePacks: ImagePack[]
): [EmojiGroupItem[], StickerGroupItem[]] => {
  const mx = useMatrixClient();

  const recentEmojis = useRecentEmoji(mx, 21);
  const labels = useEmojiGroupLabels();

  const emojiGroupItems = useMemo(() => {
    const g: EmojiGroupItem[] = [];
    if (tab !== EmojiBoardTab.Emoji) return g;

    g.push({
      id: RECENT_GROUP_ID,
      name: 'Recent',
      items: recentEmojis,
    });

    imagePacks.forEach((pack) => {
      let label = pack.meta.name;
      if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

      g.push({
        id: pack.id,
        name: label ?? 'Unknown',
        items: pack
          .getImages(ImageUsage.Emoticon)
          .sort((a, b) => a.shortcode.localeCompare(b.shortcode)),
      });
    });

    emojiGroups.forEach((group) => {
      g.push({
        id: group.id,
        name: labels[group.id],
        items: group.emojis,
      });
    });

    return g;
  }, [mx, recentEmojis, labels, imagePacks, tab]);

  const stickerGroupItems = useMemo(() => {
    const g: StickerGroupItem[] = [];
    if (tab !== EmojiBoardTab.Sticker) return g;

    imagePacks.forEach((pack) => {
      let label = pack.meta.name;
      if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

      g.push({
        id: pack.id,
        name: label ?? 'Unknown',
        items: pack
          .getImages(ImageUsage.Sticker)
          .sort((a, b) => a.shortcode.localeCompare(b.shortcode)),
      });
    });

    return g;
  }, [mx, imagePacks, tab]);

  return [emojiGroupItems, stickerGroupItems];
};

const useItemRenderer = (tab: EmojiBoardTab) => {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const renderItem = (emoji: IEmoji | PackImageReader, index: number) => {
    if ('unicode' in emoji) {
      return <EmojiItem key={emoji.unicode + index} emoji={emoji} />;
    }
    if (tab === EmojiBoardTab.Sticker) {
      return (
        <StickerItem
          key={emoji.shortcode + index}
          mx={mx}
          useAuthentication={useAuthentication}
          image={emoji}
        />
      );
    }
    return (
      <CustomEmojiItem
        key={emoji.shortcode + index}
        mx={mx}
        useAuthentication={useAuthentication}
        image={emoji}
      />
    );
  };

  return renderItem;
};

type EmojiSidebarProps = {
  activeGroupAtom: PrimitiveAtom<string | undefined>;
  packs: ImagePack[];
  onScrollToGroup: (groupId: string) => void;
};
function EmojiSidebar({ activeGroupAtom, packs, onScrollToGroup }: EmojiSidebarProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [activeGroupId, setActiveGroupId] = useAtom(activeGroupAtom);
  const usage = ImageUsage.Emoticon;
  const labels = useEmojiGroupLabels();
  const icons = useEmojiGroupIcons();

  const handleScrollToGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    onScrollToGroup(groupId);
  };

  return (
    <Sidebar>
      <SidebarStack>
        <GroupIcon
          active={activeGroupId === RECENT_GROUP_ID}
          id={RECENT_GROUP_ID}
          label="Recent"
          icon={Icons.RecentClock}
          onClick={handleScrollToGroup}
        />
      </SidebarStack>
      {packs.length > 0 && (
        <SidebarStack>
          <SidebarDivider />
          {packs.map((pack) => {
            let label = pack.meta.name;
            if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

            const url =
              mxcUrlToHttp(mx, pack.getAvatarUrl(usage) ?? '', useAuthentication) ?? undefined;

            return (
              <ImageGroupIcon
                key={pack.id}
                active={activeGroupId === pack.id}
                id={pack.id}
                label={label ?? 'Unknown Pack'}
                url={url}
                onClick={handleScrollToGroup}
              />
            );
          })}
        </SidebarStack>
      )}
      <SidebarStack
        style={{
          position: 'sticky',
          bottom: '-67%',
          zIndex: 1,
        }}
      >
        <SidebarDivider />
        {emojiGroups.map((group) => (
          <GroupIcon
            key={group.id}
            active={activeGroupId === group.id}
            id={group.id}
            label={labels[group.id]}
            icon={icons[group.id]}
            onClick={handleScrollToGroup}
          />
        ))}
      </SidebarStack>
    </Sidebar>
  );
}

type StickerSidebarProps = {
  activeGroupAtom: PrimitiveAtom<string | undefined>;
  packs: ImagePack[];
  onScrollToGroup: (groupId: string) => void;
};
function StickerSidebar({ activeGroupAtom, packs, onScrollToGroup }: StickerSidebarProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [activeGroupId, setActiveGroupId] = useAtom(activeGroupAtom);
  const usage = ImageUsage.Sticker;

  const handleScrollToGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    onScrollToGroup(groupId);
  };

  return (
    <Sidebar>
      <SidebarStack>
        {packs.map((pack) => {
          let label = pack.meta.name;
          if (!label) label = isUserId(pack.id) ? 'Personal Pack' : mx.getRoom(pack.id)?.name;

          const url =
            mxcUrlToHttp(mx, pack.getAvatarUrl(usage) ?? '', useAuthentication) ?? undefined;

          return (
            <ImageGroupIcon
              key={pack.id}
              active={activeGroupId === pack.id}
              id={pack.id}
              label={label ?? 'Unknown Pack'}
              url={url}
              onClick={handleScrollToGroup}
            />
          );
        })}
      </SidebarStack>
    </Sidebar>
  );
}

type EmojiGroupHolderProps = {
  contentScrollRef: RefObject<HTMLDivElement>;
  previewAtom: PrimitiveAtom<PreviewData | undefined>;
  children?: ReactNode;
  onGroupItemClick: MouseEventHandler;
};
function EmojiGroupHolder({
  contentScrollRef,
  previewAtom,
  onGroupItemClick,
  children,
}: EmojiGroupHolderProps) {
  const setPreviewData = useSetAtom(previewAtom);

  const handleEmojiPreview = useCallback(
    (element: HTMLButtonElement) => {
      const emojiInfo = getEmojiItemInfo(element);
      if (!emojiInfo) return;

      setPreviewData({
        key: emojiInfo.data,
        shortcode: emojiInfo.shortcode,
      });
    },
    [setPreviewData]
  );

  const throttleEmojiHover = useThrottle(handleEmojiPreview, {
    wait: 200,
    immediate: true,
  });

  const handleEmojiHover: MouseEventHandler = (evt) => {
    const targetEl = targetFromEvent(evt.nativeEvent, 'button') as HTMLButtonElement | undefined;
    if (!targetEl) return;
    throttleEmojiHover(targetEl);
  };

  const handleEmojiFocus: FocusEventHandler = (evt) => {
    const targetEl = evt.target as HTMLButtonElement;
    handleEmojiPreview(targetEl);
  };

  return (
    <Scroll ref={contentScrollRef} size="400" onKeyDown={preventScrollWithArrowKey} hideTrack>
      <Box
        onClick={onGroupItemClick}
        onMouseMove={handleEmojiHover}
        onFocus={handleEmojiFocus}
        direction="Column"
      >
        {children}
      </Box>
    </Scroll>
  );
}

const DefaultEmojiPreview: PreviewData = { key: '🙂', shortcode: 'slight_smile' };

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};

const VIRTUAL_OVER_SCAN = 2;

type EmojiBoardProps = {
  tab?: EmojiBoardTab;
  onTabChange?: (tab: EmojiBoardTab) => void;
  imagePackRooms: Room[];
  requestClose: () => void;
  returnFocusOnDeactivate?: boolean;
  onEmojiSelect?: (unicode: string, shortcode: string) => void;
  onCustomEmojiSelect?: (mxc: string, shortcode: string) => void;
  onStickerSelect?: (mxc: string, shortcode: string, label: string) => void;
  onGifSelect?: (gif: KlipyGif) => void;
  allowTextCustomEmoji?: boolean;
  addToRecentEmoji?: boolean;
};

export function EmojiBoard({
  tab = EmojiBoardTab.Emoji,
  onTabChange,
  imagePackRooms,
  requestClose,
  returnFocusOnDeactivate,
  onEmojiSelect,
  onCustomEmojiSelect,
  onStickerSelect,
  onGifSelect,
  allowTextCustomEmoji,
  addToRecentEmoji = true,
}: EmojiBoardProps) {
  const mx = useMatrixClient();
  const [klipyApiKey] = useSetting(settingsAtom, 'klipyApiKey');
  // The GIF tab is offered wherever a GIF handler is wired (the composer), and
  // is enabled once a personal Klipy key exists — otherwise it shows greyed
  // with a tooltip pointing to Settings.
  const showGif = Boolean(onGifSelect);
  const gifEnabled = klipyApiKey.length > 0;

  const emojiTab = tab === EmojiBoardTab.Emoji;
  const usage = emojiTab ? ImageUsage.Emoticon : ImageUsage.Sticker;

  const previewAtom = useMemo(
    () => createPreviewDataAtom(emojiTab ? DefaultEmojiPreview : undefined),
    [emojiTab]
  );
  const activeGroupIdAtom = useMemo(() => atom<string | undefined>(undefined), []);
  const setActiveGroupId = useSetAtom(activeGroupIdAtom);
  const imagePacks = useRelevantImagePacks(usage, imagePackRooms);
  const [emojiGroupItems, stickerGroupItems] = useGroups(tab, imagePacks);
  const groups = emojiTab ? emojiGroupItems : stickerGroupItems;
  const renderItem = useItemRenderer(tab);

  const searchList = useMemo(() => {
    let list: Array<PackImageReader | IEmoji> = [];
    list = list.concat(imagePacks.flatMap((pack) => pack.getImages(usage)));
    if (emojiTab) list = list.concat(emojis);
    return list;
  }, [emojiTab, usage, imagePacks]);

  const [result, search, resetSearch] = useAsyncSearch(
    searchList,
    getEmoticonSearchStr,
    SEARCH_OPTIONS
  );

  const searchedItems = result?.items.slice(0, 100);

  const handleOnChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
    useCallback(
      (evt) => {
        const term = evt.target.value;
        if (term) search(term);
        else resetSearch();
      },
      [search, resetSearch]
    ),
    { wait: 200 }
  );

  const contentScrollRef = useRef<HTMLDivElement>(null);
  const virtualBaseRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => contentScrollRef.current,
    estimateSize: () => 40,
    overscan: VIRTUAL_OVER_SCAN,
  });
  const vItems = virtualizer.getVirtualItems();

  const handleGroupItemClick: MouseEventHandler = (evt) => {
    const targetEl = targetFromEvent(evt.nativeEvent, 'button');
    const emojiInfo = targetEl && getEmojiItemInfo(targetEl);
    if (!emojiInfo) return;

    if (emojiInfo.type === EmojiType.Emoji) {
      onEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
      if (!evt.altKey && !evt.shiftKey && addToRecentEmoji) {
        addRecentEmoji(mx, emojiInfo.data);
      }
    }
    if (emojiInfo.type === EmojiType.CustomEmoji) {
      onCustomEmojiSelect?.(emojiInfo.data, emojiInfo.shortcode);
    }
    if (emojiInfo.type === EmojiType.Sticker) {
      onStickerSelect?.(emojiInfo.data, emojiInfo.shortcode, emojiInfo.label);
    }
    if (!evt.altKey && !evt.shiftKey) requestClose();
  };

  const handleTextCustomEmojiSelect = (textEmoji: string) => {
    onCustomEmojiSelect?.(textEmoji, textEmoji);
    requestClose();
  };

  const handleScrollToGroup = (groupId: string) => {
    const groupIndex = groups.findIndex((group) => group.id === groupId);
    virtualizer.scrollToIndex(groupIndex, { align: 'start' });
  };

  // sync active sidebar tab with scroll
  useEffect(() => {
    const scrollElement = contentScrollRef.current;
    if (scrollElement) {
      const scrollTop = scrollElement.offsetTop + scrollElement.scrollTop;
      const offsetTop = virtualBaseRef.current?.offsetTop ?? 0;
      const inViewVItem = vItems.find((vItem) => scrollTop < offsetTop + vItem.end);

      const group = inViewVItem ? groups[inViewVItem?.index] : undefined;
      setActiveGroupId(group?.id);
    }
  }, [vItems, groups, setActiveGroupId, result?.query]);

  // reset scroll position on search
  useEffect(() => {
    const scrollElement = contentScrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTo({ top: 0 });
    }
  }, [result?.query]);

  // reset scroll position on tab change
  useEffect(() => {
    if (groups.length > 0) {
      virtualizer.scrollToIndex(0, { align: 'start' });
    }
  }, [tab, virtualizer, groups]);

  const tabsNode = onTabChange && (
    <EmojiBoardTabs tab={tab} onTabChange={onTabChange} showGif={showGif} gifEnabled={gifEnabled} />
  );

  const boardWrapperRef = useRef<HTMLDivElement>(null);

  // The board is anchored to its bottom-right corner (see the outer/inner
  // split below), so growing it only ever needs to push the left and/or top
  // edge outward. `axis` picks which of those the handle being dragged
  // controls.
  const startResize = useCallback(
    (axis: { x?: boolean; y?: boolean }): PointerEventHandler =>
      (evt) => {
        const wrapperEl = boardWrapperRef.current;
        if (!wrapperEl || evt.button !== 0) return;
        evt.preventDefault();

        const startX = evt.clientX;
        const startY = evt.clientY;
        const startWidth = wrapperEl.offsetWidth;
        const startHeight = wrapperEl.offsetHeight;
        const { userSelect } = document.body.style;
        document.body.style.userSelect = 'none';

        const handlePointerMove = (moveEvt: PointerEvent) => {
          if (axis.x) wrapperEl.style.width = `${startWidth + (startX - moveEvt.clientX)}px`;
          if (axis.y) wrapperEl.style.height = `${startHeight + (startY - moveEvt.clientY)}px`;
        };
        const handlePointerUp = () => {
          document.body.style.userSelect = userSelect;
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
          savedBoardSize = { width: wrapperEl.style.width, height: wrapperEl.style.height };
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
      },
    []
  );

  const boardInitialWidth = `min(${toRem(432)}, calc(100vw - 2 * ${config.space.S400}))`;
  const boardInitialHeight = toRem(450);
  const boardWidth = savedBoardSize?.width ?? boardInitialWidth;
  const boardHeight = savedBoardSize?.height ?? boardInitialHeight;
  const RESIZE_CORNER = toRem(10);
  const RESIZE_EDGE = toRem(6);

  return (
    <FocusTrap
      focusTrapOptions={{
        returnFocusOnDeactivate,
        initialFocus: false,
        onDeactivate: requestClose,
        clickOutsideDeactivates: true,
        allowOutsideClick: true,
        isKeyForward: (evt: KeyboardEvent) =>
          !editableActiveElement() && isKeyHotkey(['arrowdown', 'arrowright'], evt),
        isKeyBackward: (evt: KeyboardEvent) =>
          !editableActiveElement() && isKeyHotkey(['arrowup', 'arrowleft'], evt),
        escapeDeactivates: stopPropagation,
      }}
    >
      {/* Outer anchor: a stable, never-resized element so FocusTrap always
          points at the same node across tab switches, and so the popout
          positioning logic (which measures this element once) is never
          disturbed by resizing. It keeps the board's original footprint;
          the actual resizable box below is absolutely positioned over its
          bottom-right corner, so growing it (via the handles) only ever
          pushes the left and/or top edge outward — the corner nearest the
          trigger button stays put, matching how the popout is anchored. */}
      <div
        style={{
          position: 'relative',
          width: boardInitialWidth,
          height: boardInitialHeight,
        }}
      >
        <div
          ref={boardWrapperRef}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            display: 'flex',
            width: boardWidth,
            height: boardHeight,
            minWidth: boardInitialWidth,
            minHeight: boardInitialHeight,
            maxWidth: `calc(100vw - 2 * ${config.space.S400})`,
            maxHeight: `calc(100vh - 2 * ${config.space.S400})`,
            overflow: 'hidden',
          }}
        >
          {tab === EmojiBoardTab.Gif && onGifSelect ? (
            <GifContent
              header={tabsNode}
              onGifSelect={(gif) => {
                onGifSelect(gif);
                requestClose();
              }}
            />
          ) : (
            <EmojiBoardLayout
              header={
                <Box direction="Column" gap="200">
                  {tabsNode}
                  <SearchInput
                    key={tab}
                    query={result?.query}
                    onChange={handleOnChange}
                    allowTextCustomEmoji={allowTextCustomEmoji}
                    onTextCustomEmojiSelect={handleTextCustomEmojiSelect}
                  />
                </Box>
              }
              sidebar={
                emojiTab ? (
                  <EmojiSidebar
                    activeGroupAtom={activeGroupIdAtom}
                    packs={imagePacks}
                    onScrollToGroup={handleScrollToGroup}
                  />
                ) : (
                  <StickerSidebar
                    activeGroupAtom={activeGroupIdAtom}
                    packs={imagePacks}
                    onScrollToGroup={handleScrollToGroup}
                  />
                )
              }
            >
              <Box grow="Yes">
                <EmojiGroupHolder
                  key={tab}
                  contentScrollRef={contentScrollRef}
                  previewAtom={previewAtom}
                  onGroupItemClick={handleGroupItemClick}
                >
                  {searchedItems && (
                    <EmojiGroup
                      id={SEARCH_GROUP_ID}
                      label={searchedItems.length ? 'Search Results' : 'No Results found'}
                    >
                      {searchedItems.map(renderItem)}
                    </EmojiGroup>
                  )}
                  <div
                    ref={virtualBaseRef}
                    style={{
                      position: 'relative',
                      height: virtualizer.getTotalSize(),
                    }}
                  >
                    {vItems.map((vItem) => {
                      const group = groups[vItem.index];

                      return (
                        <VirtualTile
                          virtualItem={vItem}
                          style={{ paddingTop: config.space.S200 }}
                          ref={virtualizer.measureElement}
                          key={vItem.index}
                        >
                          <EmojiGroup key={group.id} id={group.id} label={group.name}>
                            {group.items.map(renderItem)}
                          </EmojiGroup>
                        </VirtualTile>
                      );
                    })}
                  </div>
                  {tab === EmojiBoardTab.Sticker && groups.length === 0 && <NoStickerPacks />}
                </EmojiGroupHolder>
              </Box>
              <Preview previewAtom={previewAtom} />
            </EmojiBoardLayout>
          )}
          {/* Invisible drag zones — no grip glyph, just the matching resize
              cursor on hover, same as the browser's own edge-resize regions. */}
          <div
            onPointerDown={startResize({ x: true })}
            title="Resize"
            style={{
              position: 'absolute',
              left: 0,
              top: RESIZE_CORNER,
              bottom: 0,
              width: RESIZE_EDGE,
              cursor: 'ew-resize',
              touchAction: 'none',
              zIndex: 2,
            }}
          />
          <div
            onPointerDown={startResize({ y: true })}
            title="Resize"
            style={{
              position: 'absolute',
              top: 0,
              left: RESIZE_CORNER,
              right: 0,
              height: RESIZE_EDGE,
              cursor: 'ns-resize',
              touchAction: 'none',
              zIndex: 2,
            }}
          />
          <div
            onPointerDown={startResize({ x: true, y: true })}
            title="Resize"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: RESIZE_CORNER,
              height: RESIZE_CORNER,
              cursor: 'nwse-resize',
              touchAction: 'none',
              zIndex: 3,
            }}
          />
        </div>
      </div>
    </FocusTrap>
  );
}
