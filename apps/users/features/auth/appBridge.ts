interface MakkigoAppChannel {
  postMessage: (message: string) => void;
}

const getAppChannel = () =>
  (window as Window & { MakkigoApp?: MakkigoAppChannel }).MakkigoApp ?? null;

const isInApp = () => getAppChannel() !== null;

const toAbsoluteUrl = (path: string) => new URL(path, window.location.origin).toString();

const openAppAuthSession = ({ url, returnUrl }: { url: string; returnUrl: string }) => {
  getAppChannel()?.postMessage(
    JSON.stringify({
      type: "openAuthSession",
      url: toAbsoluteUrl(url),
      returnUrl: toAbsoluteUrl(returnUrl),
    }),
  );
};

export { isInApp, openAppAuthSession };
