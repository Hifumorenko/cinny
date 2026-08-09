import { createContext, useContext } from 'react';
import { DirectCategoriesAtom } from '../directCategories';

const DirectCategoriesAtomContext = createContext<DirectCategoriesAtom | null>(null);
export const DirectCategoriesProvider = DirectCategoriesAtomContext.Provider;

export const useDirectCategoriesAtom = (): DirectCategoriesAtom => {
  const anAtom = useContext(DirectCategoriesAtomContext);

  if (!anAtom) {
    throw new Error('DirectCategoriesAtom is not provided!');
  }

  return anAtom;
};
