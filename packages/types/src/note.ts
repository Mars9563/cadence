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

/**
 * Acknowledgement for a persisted Daily Note content update.
 *
 * Deliberately carries no content or timestamps: the client's editor is the
 * source of truth while editing, so the server never echoes a document back.
 *
 * `saveId` is chosen by the client for each save attempt and echoed back, so
 * an acknowledgement can be matched to the exact save it belongs to.
 */
export type DailyNoteSaveAck = {
  noteId: string;
  saveId: number;
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

/**
 * A Note without its Markdown content.
 *
 * Returned by list/rename/move operations so the notes tree can be loaded
 * without transferring every document. Content is fetched per note on open.
 */
export type NoteSummary = Omit<Note, 'content'>;

/**
 * Acknowledgement for a persisted Note content update.
 *
 * Same contract as `DailyNoteSaveAck`: no content or timestamps are echoed
 * back, and `saveId` matches the ack to the client's save attempt.
 */
export type NoteSaveAck = {
  noteId: string;
  saveId: number;
};
