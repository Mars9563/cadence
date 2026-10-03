export type apiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
