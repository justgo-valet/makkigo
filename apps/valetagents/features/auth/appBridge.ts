interface MakkigoAppChannel { postMessage: (message: string) => void }

const channel = () => (window as Window & { MakkigoApp?: MakkigoAppChannel }).MakkigoApp ?? null;
export const isInApp = () => channel() !== null;
export const openAppAuthSession = ({ url, returnUrl }: { url: string; returnUrl: string }) => {
  const absolute = (path: string) => new URL(path, window.location.origin).toString();
  channel()?.postMessage(JSON.stringify({
    type: "openAuthSession",
    url: absolute(url),
    returnUrl: absolute(returnUrl),
  }));
};
