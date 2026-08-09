import { WritableAtom, atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const DIRECT_CATEGORIES = 'directCategories';

export type DirectCategory = {
  id: string;
  name: string;
};

export type DirectCategoriesState = {
  // Order here is display order.
  categories: DirectCategory[];
  // roomId -> categoryId. Rooms with no entry (or an entry pointing at a
  // deleted category) fall back to the built-in "Uncategorized" bucket.
  roomCategory: Map<string, string>;
};

type StoredDirectCategoriesState = {
  categories: DirectCategory[];
  roomCategory: [string, string][];
};

const DEFAULT_STATE: DirectCategoriesState = {
  categories: [],
  roomCategory: new Map(),
};

type DirectCategoriesAction =
  | { type: 'CREATE'; id: string; name: string }
  | { type: 'RENAME'; id: string; name: string }
  | { type: 'DELETE'; id: string }
  | { type: 'ASSIGN'; roomId: string; categoryId: string | undefined };

export type DirectCategoriesAtom = WritableAtom<
  DirectCategoriesState,
  [DirectCategoriesAction],
  undefined
>;

export const makeDirectCategoriesAtom = (userId: string): DirectCategoriesAtom => {
  const storeKey = `${DIRECT_CATEGORIES}${userId}`;

  const baseDirectCategoriesAtom = atomWithLocalStorage<DirectCategoriesState>(
    storeKey,
    (key) => {
      const stored = getLocalStorageItem<StoredDirectCategoriesState>(key, {
        categories: DEFAULT_STATE.categories,
        roomCategory: [],
      });
      return {
        categories: stored.categories,
        roomCategory: new Map(stored.roomCategory),
      };
    },
    (key, value) => {
      const stored: StoredDirectCategoriesState = {
        categories: value.categories,
        roomCategory: Array.from(value.roomCategory),
      };
      setLocalStorageItem(key, stored);
    }
  );

  const directCategoriesAtom = atom<DirectCategoriesState, [DirectCategoriesAction], undefined>(
    (get) => get(baseDirectCategoriesAtom),
    (get, set, action) => {
      set(
        baseDirectCategoriesAtom,
        produce(get(baseDirectCategoriesAtom), (draft) => {
          if (action.type === 'CREATE') {
            draft.categories.push({ id: action.id, name: action.name });
            return;
          }
          if (action.type === 'RENAME') {
            const category = draft.categories.find((c) => c.id === action.id);
            if (category) category.name = action.name;
            return;
          }
          if (action.type === 'DELETE') {
            const categoryIndex = draft.categories.findIndex((c) => c.id === action.id);
            if (categoryIndex !== -1) draft.categories.splice(categoryIndex, 1);
            draft.roomCategory.forEach((categoryId, roomId) => {
              if (categoryId === action.id) draft.roomCategory.delete(roomId);
            });
            return;
          }
          if (action.type === 'ASSIGN') {
            if (action.categoryId === undefined) {
              draft.roomCategory.delete(action.roomId);
              return;
            }
            draft.roomCategory.set(action.roomId, action.categoryId);
          }
        })
      );
    }
  );

  return directCategoriesAtom;
};
