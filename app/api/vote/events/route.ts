import { readVote, voteRefs, voteFailure } from "@/lib/liveVoteServer";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const initial = await readVote();
    const { state } = voteRefs();
    const encoder = new TextEncoder();
    let cleanup: (close?: boolean) => void = () => {};
    const stream = new ReadableStream({
      start(controller) {
        let finished = false;
        let unsubscribe = () => {};
        let chain = Promise.resolve();
        const send = (event: string, data: unknown) => {
          if (!finished) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        const abort = () => cleanup();
        cleanup = (close = true) => {
          if (finished) return;
          finished = true;
          unsubscribe();
          clearInterval(heartbeat);
          clearTimeout(deadline);
          request.signal.removeEventListener("abort", abort);
          if (close) controller.close();
        };
        const heartbeat = setInterval(() => { if (!finished) controller.enqueue(encoder.encode(": heartbeat\n\n")); }, 15000);
        // Transport reconnect only; this never closes the classroom vote.
        const deadline = setTimeout(() => cleanup(), 55000);
        send("vote", initial);
        unsubscribe = state.onSnapshot(() => {
          // Serialize asynchronous reads so an older snapshot can never follow a reset.
          chain = chain.then(async () => { if (!finished) send("vote", await readVote()); }).catch(error => {
            console.error("live-vote stream read failed", error instanceof Error ? error.message : "unknown");
            send("unavailable", {}); cleanup();
          });
        }, error => {
          console.error("live-vote stream failed", error.message);
          send("unavailable", {}); cleanup();
        });
        request.signal.addEventListener("abort", abort, { once: true });
        if (request.signal.aborted) cleanup();
      },
      cancel() { cleanup(false); },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) { return voteFailure(error); }
}
