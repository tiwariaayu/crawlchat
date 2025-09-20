import React, { useEffect, type ReactNode } from "react";
import Layout from "@theme-original/Layout";
import type LayoutType from "@theme/Layout";
import type { WrapperProps } from "@docusaurus/types";
import { useHistory } from "@docusaurus/router";

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): ReactNode {
  const history = useHistory();

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "internal-link-click") {
          const url = new URL(data.url);
          history.push(url.pathname);
        }
        if (data.type === "embed-ready") {
          const iframe = document.getElementById(
            "crawlchat-iframe"
          ) as HTMLIFrameElement;
          iframe?.contentWindow.postMessage(
            JSON.stringify({
              type: "internal-link-host",
              host: window.location.host,
            }),
            "*"
          );
        }
      } catch {}
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <>
      <Layout {...props} />
    </>
  );
}
