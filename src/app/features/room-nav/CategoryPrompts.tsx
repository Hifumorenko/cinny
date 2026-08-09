import React, { FormEventHandler } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Dialog,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  Header,
  config,
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Button,
  Input,
} from 'folds';
import { stopPropagation } from '../../utils/keyboard';

type CategoryNamePromptProps = {
  title: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};
export function CategoryNamePrompt({
  title,
  submitLabel,
  initialName,
  onSubmit,
  onCancel,
}: CategoryNamePromptProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const target = evt.target as HTMLFormElement | undefined;
    const nameInput = target?.categoryNameInput as HTMLInputElement | undefined;
    const name = nameInput?.value.trim();
    if (!name) return;
    onSubmit(name);
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">{title}</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box
              as="form"
              onSubmit={handleSubmit}
              style={{ padding: config.space.S400, paddingTop: 0 }}
              direction="Column"
              gap="400"
            >
              <Box direction="Column" gap="100">
                <Text size="L400">Category Name</Text>
                <Input
                  size="500"
                  autoFocus
                  name="categoryNameInput"
                  variant="Background"
                  placeholder="Category Name"
                  defaultValue={initialName}
                  maxLength={100}
                  required
                />
              </Box>
              <Button type="submit" variant="Primary">
                <Text size="B400">{submitLabel}</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type DeleteCategoryPromptProps = {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
};
export function DeleteCategoryPrompt({ name, onConfirm, onCancel }: DeleteCategoryPromptProps) {
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Delete Category</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text priority="400">
                Delete <b>{name}</b>? Chats in it move back to Uncategorized — they are not
                removed from your Direct Messages.
              </Text>
              <Button type="submit" variant="Critical" onClick={onConfirm}>
                <Text size="B400">Delete</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
