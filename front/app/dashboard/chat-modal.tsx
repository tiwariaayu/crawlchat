export function ChatModal({ token }: { token: string }) {
  return (
    <dialog id="chat-modal" className="modal">
      <div className="modal-box p-0 w-1/2 max-w-[700px]">
        <iframe
          src={`/w/crawlchat-internal?secret=${token}&embed=true`}
          style={{ width: "100%", height: "600px" }}
        />
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
