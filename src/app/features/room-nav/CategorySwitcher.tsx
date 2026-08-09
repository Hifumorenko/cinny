import React, { MouseEventHandler, ReactNode, useState } from 'react';
import { Box, config, Icon, Icons, Line, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useAtom } from 'jotai';
import { stopPropagation } from '../../utils/keyboard';
import { useDirectCategoriesAtom } from '../../state/hooks/directCategories';
import { CategoryNamePrompt } from './CategoryPrompts';

type CategorySwitcherProps = {
  roomId: string;
  children: (handleOpen: MouseEventHandler<HTMLButtonElement>, opened: boolean) => ReactNode;
};
export function CategorySwitcher({ roomId, children }: CategorySwitcherProps) {
  const [{ categories, roomCategory }, setDirectCategories] = useAtom(useDirectCategoriesAtom());
  const currentCategoryId = roomCategory.get(roomId);

  const [menuCords, setMenuCords] = useState<RectCords>();
  const [creating, setCreating] = useState(false);

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleClose = () => {
    setMenuCords(undefined);
    setCreating(false);
  };

  const handleAssign = (categoryId: string | undefined) => {
    setDirectCategories({ type: 'ASSIGN', roomId, categoryId });
    handleClose();
  };

  const handleCreateAndAssign = (name: string) => {
    const id = crypto.randomUUID();
    setDirectCategories({ type: 'CREATE', id, name });
    setDirectCategories({ type: 'ASSIGN', roomId, categoryId: id });
    handleClose();
  };

  return (
    <PopOut
      anchor={menuCords}
      offset={5}
      position="Right"
      align="Start"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: handleClose,
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) =>
              evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
            escapeDeactivates: stopPropagation,
          }}
        >
          <div>
            {creating && (
              <CategoryNamePrompt
                title="New Category"
                submitLabel="Create"
                onSubmit={handleCreateAndAssign}
                onCancel={() => setCreating(false)}
              />
            )}
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  size="300"
                  variant="Surface"
                  aria-pressed={!currentCategoryId}
                  radii="300"
                  onClick={() => handleAssign(undefined)}
                >
                  <Text size="T300">{!currentCategoryId ? <b>Uncategorized</b> : 'Uncategorized'}</Text>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem
                    key={category.id}
                    size="300"
                    variant="Surface"
                    aria-pressed={category.id === currentCategoryId}
                    radii="300"
                    onClick={() => handleAssign(category.id)}
                  >
                    <Text size="T300" truncate>
                      {category.id === currentCategoryId ? <b>{category.name}</b> : category.name}
                    </Text>
                  </MenuItem>
                ))}
              </Box>
              <Line variant="Surface" size="300" />
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  size="300"
                  variant="Surface"
                  radii="300"
                  before={<Icon size="100" src={Icons.Plus} />}
                  onClick={() => setCreating(true)}
                >
                  <Text size="T300">New Category</Text>
                </MenuItem>
              </Box>
            </Menu>
          </div>
        </FocusTrap>
      }
    >
      {children(handleOpenMenu, !!menuCords)}
    </PopOut>
  );
}
