export function CrawlChatScript({
  id,
  sidePanel,
  src,
  hideAskAI,
}: {
  id: string;
  sidePanel?: boolean;
  src?: string;
  hideAskAI?: boolean;
}) {
  return (
    <script
      src={src ?? "https://crawlchat.app/embed.js"}
      async
      id="crawlchat-script"
      data-id={id}
      data-tag-sidepanel={sidePanel}
      data-hide-ask-ai={hideAskAI}
    />
  );
}
