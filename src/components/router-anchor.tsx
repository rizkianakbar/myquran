import { useRouter } from '@tanstack/react-router';

function isPlainClick(event: React.MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * A plain `<a href>` that navigates client-side on a plain click. For lists
 * rendering many links (every verse, every surah): a router `Link` subscribes
 * to router state, and hundreds of them make a list slow to mount.
 */
export function RouterAnchor({ href, onClick, ...props }: React.ComponentProps<'a'> & { href: string }) {
  const router = useRouter();

  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !isPlainClick(event)) return;
        event.preventDefault();
        void router.navigate({ href });
      }}
      {...props}
    />
  );
}
