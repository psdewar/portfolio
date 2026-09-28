export interface WhepSession {
  pc: RTCPeerConnection;
  close: () => void;
  restartIce: () => Promise<boolean>;
}

export class WhepNotLiveError extends Error {
  constructor() {
    super("whep path not live");
    this.name = "WhepNotLiveError";
  }
}

const STUN: RTCIceServer = { urls: "stun:stun.l.google.com:19302" };

function waitFor(target: EventTarget, event: string, done: () => boolean, timeoutMs: number) {
  return new Promise<void>((resolve) => {
    if (done()) return resolve();
    const timer = setTimeout(finish, timeoutMs);
    function finish() {
      target.removeEventListener(event, onEvent);
      clearTimeout(timer);
      resolve();
    }
    function onEvent() {
      if (done()) finish();
    }
    target.addEventListener(event, onEvent);
  });
}

function parseIceServers(link: string | null): RTCIceServer[] {
  if (!link) return [];
  const servers: RTCIceServer[] = [];
  for (const [, urls, params] of link.matchAll(/<([^>]+)>([^<]*)/g)) {
    if (!/rel="?ice-server"?/.test(params)) continue;
    const username = params.match(/username="([^"]*)"/)?.[1];
    const credential = params.match(/credential="([^"]*)"/)?.[1];
    servers.push(username && credential ? { urls, username, credential } : { urls });
  }
  return servers;
}

function mergeIceServers(a: RTCIceServer[], b: RTCIceServer[]): RTCIceServer[] {
  const seen = new Set<string>();
  const merged: RTCIceServer[] = [];
  for (const server of [...a, ...b]) {
    const key = JSON.stringify(server.urls);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(server);
  }
  return merged;
}

async function fetchCapabilities(url: string): Promise<{ iceServers: RTCIceServer[]; trickle: boolean }> {
  const res = await fetch(url, { method: "OPTIONS" }).catch(() => null);
  const acceptPatch = (res?.headers.get("Accept-Patch") ?? "").toLowerCase();
  return {
    iceServers: parseIceServers(res?.headers.get("Link") ?? null),
    trickle: acceptPatch.includes("trickle-ice-sdpfrag"),
  };
}

function extractIceCredentials(sdp: string | undefined): { ufrag: string; pwd: string } | null {
  if (!sdp) return null;
  const ufrag = sdp.match(/a=ice-ufrag:(\S+)/)?.[1];
  const pwd = sdp.match(/a=ice-pwd:(\S+)/)?.[1];
  return ufrag && pwd ? { ufrag, pwd } : null;
}

function sdpFragForCandidate(candidate: RTCIceCandidate, ufrag: string, pwd: string): string {
  const mid = candidate.sdpMid ?? "0";
  return [
    `a=ice-ufrag:${ufrag}`,
    `a=ice-pwd:${pwd}`,
    `m=application 9 UDP/DTLS/SCTP webrtc-datachannel`,
    `a=mid:${mid}`,
    `a=candidate:${candidate.candidate}`,
    "",
  ].join("\r\n");
}

export type WhepVideoTarget = HTMLVideoElement | (() => HTMLVideoElement | null);

function resolveVideo(target: WhepVideoTarget): HTMLVideoElement | null {
  return typeof target === "function" ? target() : target;
}

export function connectWhep(
  url: string,
  videoTarget: WhepVideoTarget,
  timeoutMs = 4000,
): Promise<WhepSession> {
  let pc: RTCPeerConnection | null = null;
  let timedOut = false;
  let sessionUrl: string | null = null;
  let etag: string | null = null;

  const deleteSession = () => {
    if (!sessionUrl) return;
    fetch(sessionUrl, { method: "DELETE", keepalive: true }).catch(() => {});
    sessionUrl = null;
  };

  const attempt = async (): Promise<WhepSession> => {
    const capabilities = await fetchCapabilities(url);
    if (timedOut) throw new Error("whep timeout");
    const conn = new RTCPeerConnection({
      iceServers: capabilities.iceServers.length ? capabilities.iceServers : [STUN],
    });
    pc = conn;
    conn.addTransceiver("video", { direction: "recvonly" });
    conn.addTransceiver("audio", { direction: "recvonly" });
    conn.ontrack = (e) => {
      const video = resolveVideo(videoTarget);
      if (video && !video.srcObject) video.srcObject = e.streams[0];
    };
    conn.onicecandidate = (e) => {
      if (!capabilities.trickle || !e.candidate || !sessionUrl) return;
      const creds = extractIceCredentials(conn.localDescription?.sdp);
      if (!creds) return;
      const frag = sdpFragForCandidate(e.candidate, creds.ufrag, creds.pwd);
      fetch(sessionUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/trickle-ice-sdpfrag", "If-Match": etag ?? '"*"' },
        body: frag,
      }).catch(() => {});
    };

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    await waitFor(
      conn,
      "icegatheringstatechange",
      () => conn.iceGatheringState === "complete",
      1000,
    );

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: conn.localDescription!.sdp,
    });
    if (res.status === 404 || res.status === 405) throw new WhepNotLiveError();
    if (!res.ok) throw new Error(`whep offer failed: ${res.status}`);

    const location = res.headers.get("Location");
    sessionUrl = location
      ? new URL(location, new URL(url, window.location.href)).toString()
      : null;
    etag = res.headers.get("ETag");

    const postIceServers = parseIceServers(res.headers.get("Link"));
    if (postIceServers.length) {
      const merged = mergeIceServers(capabilities.iceServers, postIceServers);
      try {
        conn.setConfiguration({ iceServers: merged.length ? merged : [STUN] });
      } catch {}
    }

    const sdp = await res.text();
    await conn.setRemoteDescription({ type: "answer", sdp });

    await waitFor(
      conn,
      "connectionstatechange",
      () => conn.connectionState === "connected",
      timeoutMs,
    );
    if (conn.connectionState !== "connected") throw new Error("whep connect failed");

    const restartIce = async (): Promise<boolean> => {
      if (!sessionUrl) return false;
      try {
        const restartOffer = await conn.createOffer({ iceRestart: true });
        await conn.setLocalDescription(restartOffer);
        await waitFor(
          conn,
          "icegatheringstatechange",
          () => conn.iceGatheringState === "complete",
          1000,
        );
        const patchRes = await fetch(sessionUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/sdp", "If-Match": '"*"' },
          body: conn.localDescription!.sdp,
        });
        if (!patchRes.ok) return false;
        const answerSdp = await patchRes.text();
        if (answerSdp.trim()) {
          await conn.setRemoteDescription({ type: "answer", sdp: answerSdp });
        }
        return true;
      } catch {
        return false;
      }
    };

    return {
      pc: conn,
      close: () => {
        conn.close();
        deleteSession();
      },
      restartIce,
    };
  };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(fail, timeoutMs);
    function fail() {
      timedOut = true;
      pc?.close();
      deleteSession();
      reject(new Error("whep timeout"));
    }
    attempt()
      .then((session) => {
        clearTimeout(timer);
        resolve(session);
      })
      .catch((err) => {
        clearTimeout(timer);
        pc?.close();
        deleteSession();
        reject(err);
      });
  });
}
