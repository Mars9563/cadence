export type DailyNote = {
  id: string;
  userId: string;
  noteDate: string;

  /**
   * Markdown source.
   *
   * Stored as plain text in PostgreSQL.
   */
  content: string;

  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  userId: string;
  folderId: string;

  title: string;

  /**
   * Markdown source.
   *
   * Stored as plain text in PostgreSQL.
   */
  content: string;

  createdAt: string;
  updatedAt: string;
};
