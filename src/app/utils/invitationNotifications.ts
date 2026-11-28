export const countNewInvitations = (
  previous: readonly string[],
  current: readonly string[]
): number => {
  const known = new Set(previous);
  return current.filter((roomId) => !known.has(roomId)).length;
};
