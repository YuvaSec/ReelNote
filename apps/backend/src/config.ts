type EnvConfig = {
  openaiApiKey: string | undefined;
  instagramCookiesPath: string | undefined;
  instagramCookiesBrowser: string | undefined;
  instagramCookiesClear: boolean;
};

export const config: EnvConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  instagramCookiesPath: process.env.INSTAGRAM_COOKIES_PATH,
  instagramCookiesBrowser: process.env.INSTAGRAM_COOKIES_BROWSER,
  instagramCookiesClear: process.env.INSTAGRAM_COOKIES_CLEAR === "true",
};
