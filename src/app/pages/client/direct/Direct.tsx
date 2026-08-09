import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Avatar,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavCategoryHeader,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
} from '../../../components/nav';
import { getDirectCreatePath, getDirectRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { VirtualTile } from '../../../components/virtualizer';
import {
  CategoryNamePrompt,
  DeleteCategoryPrompt,
  RoomNavCategoryButton,
  RoomNavItem,
} from '../../../features/room-nav';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { DirectCategory } from '../../../state/directCategories';
import { useDirectCategoriesAtom } from '../../../state/hooks/directCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useDirectRooms } from './useDirectRooms';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { useClosedNavCategoriesAtom } from '../../../state/hooks/closedNavCategories';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../utils/notifications';
import { stopPropagation } from '../../../utils/keyboard';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';
import { useDirectCreateSelected } from '../../../hooks/router/useDirectSelected';

const DEFAULT_CATEGORY_ID = makeNavCategoryId('direct', 'direct');

type DirectMenuProps = {
  requestClose: () => void;
};
const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(({ requestClose }, ref) => {
  const mx = useMatrixClient();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const orphanRooms = useDirectRooms();
  const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
  const [, setDirectCategories] = useAtom(useDirectCategoriesAtom());
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleMarkAsRead = () => {
    if (!unread) return;
    orphanRooms.forEach((rId) => markAsRead(mx, rId, hideActivity));
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      {creatingCategory && (
        <CategoryNamePrompt
          title="New Category"
          submitLabel="Create"
          onSubmit={(name) => {
            setDirectCategories({ type: 'CREATE', id: crypto.randomUUID(), name });
            setCreatingCategory(false);
            requestClose();
          }}
          onCancel={() => setCreatingCategory(false)}
        />
      )}
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          aria-disabled={!unread}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Mark as Read
          </Text>
        </MenuItem>
        <MenuItem
          onClick={() => setCreatingCategory(true)}
          size="300"
          after={<Icon size="100" src={Icons.Plus} />}
          radii="300"
          aria-pressed={creatingCategory}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            New Category
          </Text>
        </MenuItem>
      </Box>
    </Menu>
  );
});

function DirectHeader() {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Direct Messages
            </Text>
          </Box>
          <Box>
            <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
              <Icon src={Icons.VerticalDots} size="200" />
            </IconButton>
          </Box>
        </Box>
      </PageNavHeader>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <DirectMenu requestClose={() => setMenuAnchor(undefined)} />
          </FocusTrap>
        }
      />
    </>
  );
}

function DirectEmpty() {
  const navigate = useNavigate();

  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={Icons.Mention} />}
        title={
          <Text size="H5" align="Center">
            No Direct Messages
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            You do not have any direct messages yet.
          </Text>
        }
        options={
          <Button variant="Secondary" size="300" onClick={() => navigate(getDirectCreatePath())}>
            <Text size="B300" truncate>
              Direct Message
            </Text>
          </Button>
        }
      />
    </NavEmptyCenter>
  );
}

type DirectCategoryHeaderMenuProps = {
  category: DirectCategory;
  requestClose: () => void;
};
const DirectCategoryHeaderMenu = forwardRef<HTMLDivElement, DirectCategoryHeaderMenuProps>(
  ({ category, requestClose }, ref) => {
    const [, setDirectCategories] = useAtom(useDirectCategoriesAtom());
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    return (
      <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
        {renaming && (
          <CategoryNamePrompt
            title="Rename Category"
            submitLabel="Rename"
            initialName={category.name}
            onSubmit={(name) => {
              setDirectCategories({ type: 'RENAME', id: category.id, name });
              setRenaming(false);
              requestClose();
            }}
            onCancel={() => setRenaming(false)}
          />
        )}
        {deleting && (
          <DeleteCategoryPrompt
            name={category.name}
            onConfirm={() => {
              setDirectCategories({ type: 'DELETE', id: category.id });
              setDeleting(false);
              requestClose();
            }}
            onCancel={() => setDeleting(false)}
          />
        )}
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <MenuItem
            onClick={() => setRenaming(true)}
            size="300"
            after={<Icon size="100" src={Icons.Pencil} />}
            radii="300"
            aria-pressed={renaming}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Rename
            </Text>
          </MenuItem>
          <MenuItem
            onClick={() => setDeleting(true)}
            variant="Critical"
            fill="None"
            size="300"
            after={<Icon size="100" src={Icons.Delete} />}
            radii="300"
            aria-pressed={deleting}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Delete
            </Text>
          </MenuItem>
        </Box>
      </Menu>
    );
  }
);

type DirectCategoryRowProps = {
  category: DirectCategory;
  closed: boolean;
  onToggle: MouseEventHandler<HTMLButtonElement>;
  categoryId: string;
};
function DirectCategoryRow({ category, closed, onToggle, categoryId }: DirectCategoryRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <NavCategoryHeader>
      <Box grow="Yes">
        <RoomNavCategoryButton closed={closed} data-category-id={categoryId} onClick={onToggle}>
          {category.name}
        </RoomNavCategoryButton>
      </Box>
      <Box shrink="No">
        <IconButton
          aria-pressed={!!menuAnchor}
          onClick={handleOpenMenu}
          variant="Background"
          size="300"
          radii="300"
        >
          <Icon size="50" src={Icons.VerticalDots} />
        </IconButton>
      </Box>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <DirectCategoryHeaderMenu
              category={category}
              requestClose={() => setMenuAnchor(undefined)}
            />
          </FocusTrap>
        }
      />
    </NavCategoryHeader>
  );
}

type DirectGroup = {
  id: string;
  name: string;
  category?: DirectCategory;
};

type DirectListItem =
  | { type: 'header'; group: DirectGroup }
  | { type: 'room'; roomId: string };

export function Direct() {
  const mx = useMatrixClient();
  useNavToActivePathMapper('direct');
  const scrollRef = useRef<HTMLDivElement>(null);
  const directs = useDirectRooms();
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const navigate = useNavigate();

  const createDirectSelected = useDirectCreateSelected();

  const selectedRoomId = useSelectedRoom();
  const noRoomToDisplay = directs.length === 0;
  const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());
  const [{ categories, roomCategory }] = useAtom(useDirectCategoriesAtom());

  // With no user-created categories, keep the exact original flat "Chats"
  // list untouched. Categories (and an explicit "Uncategorized" bucket for
  // whatever isn't sorted into one) only appear once the user makes one.
  const groups = useMemo<DirectGroup[]>(() => {
    if (categories.length === 0) {
      return [{ id: DEFAULT_CATEGORY_ID, name: 'Chats' }];
    }
    return [
      ...categories.map((category) => ({
        id: makeNavCategoryId('direct', category.id),
        name: category.name,
        category,
      })),
      { id: DEFAULT_CATEGORY_ID, name: 'Uncategorized' },
    ];
  }, [categories]);

  const listItems = useMemo(() => {
    const categoryIds = new Set(categories.map((category) => category.id));
    const sortedDirects = Array.from(directs).sort(factoryRoomIdByActivity(mx));

    const roomIdsByGroup = new Map<string, string[]>();
    groups.forEach((group) => roomIdsByGroup.set(group.id, []));
    sortedDirects.forEach((roomId) => {
      const assignedCategoryId = roomCategory.get(roomId);
      const groupId =
        assignedCategoryId && categoryIds.has(assignedCategoryId)
          ? makeNavCategoryId('direct', assignedCategoryId)
          : DEFAULT_CATEGORY_ID;
      roomIdsByGroup.get(groupId)?.push(roomId);
    });

    const items: DirectListItem[] = [];
    groups.forEach((group) => {
      items.push({ type: 'header', group });
      const roomIds = roomIdsByGroup.get(group.id) ?? [];
      const visibleRoomIds = closedCategories.has(group.id)
        ? roomIds.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId)
        : roomIds;
      visibleRoomIds.forEach((roomId) => items.push({ type: 'room', roomId }));
    });
    return items;
  }, [mx, directs, groups, categories, roomCategory, closedCategories, roomToUnread, selectedRoomId]);

  const virtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 0,
    overscan: 10,
  });

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  return (
    <PageNav>
      <DirectHeader />
      {noRoomToDisplay ? (
        <DirectEmpty />
      ) : (
        <PageNavContent scrollRef={scrollRef}>
          <Box direction="Column" gap="300">
            <NavCategory>
              <NavItem variant="Background" radii="400" aria-selected={createDirectSelected}>
                <NavButton onClick={() => navigate(getDirectCreatePath())}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Plus} size="100" />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Create Chat
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
            </NavCategory>
            <NavCategory
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((vItem) => {
                const item = listItems[vItem.index];
                if (!item) return null;

                if (item.type === 'header') {
                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={virtualizer.measureElement}
                    >
                      <div
                        style={{ paddingTop: vItem.index === 0 ? undefined : config.space.S400 }}
                      >
                        {item.group.category ? (
                          <DirectCategoryRow
                            categoryId={item.group.id}
                            category={item.group.category}
                            closed={closedCategories.has(item.group.id)}
                            onToggle={handleCategoryClick}
                          />
                        ) : (
                          <NavCategoryHeader>
                            <RoomNavCategoryButton
                              closed={closedCategories.has(item.group.id)}
                              data-category-id={item.group.id}
                              onClick={handleCategoryClick}
                            >
                              {item.group.name}
                            </RoomNavCategoryButton>
                          </NavCategoryHeader>
                        )}
                      </div>
                    </VirtualTile>
                  );
                }

                const room = mx.getRoom(item.roomId);
                if (!room) return null;
                const selected = selectedRoomId === item.roomId;

                return (
                  <VirtualTile
                    virtualItem={vItem}
                    key={vItem.index}
                    ref={virtualizer.measureElement}
                  >
                    <RoomNavItem
                      room={room}
                      selected={selected}
                      showAvatar
                      direct
                      categorizable
                      linkPath={getDirectRoomPath(getCanonicalAliasOrRoomId(mx, item.roomId))}
                      notificationMode={getRoomNotificationMode(
                        notificationPreferences,
                        room.roomId
                      )}
                    />
                  </VirtualTile>
                );
              })}
            </NavCategory>
          </Box>
        </PageNavContent>
      )}
    </PageNav>
  );
}
