export type Folder = {
  id: string;
  userId: string;

  /**
   * Root folder has parentId = null.
   * Every non-root folder has a parentId.
   */
  parentId: string | null;

  name: string;
  isRoot: boolean;

  createdAt: string;
  updatedAt: string;
};
