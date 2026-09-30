"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminState } from "../../lib/livestream";
import DefaultsRow from "./DefaultsRow";
import Destinations from "./Destinations";
import GroupHeader from "./GroupHeader";
import NextStreamForm from "./NextStreamForm";
import {
  Notice,
  columnsClass,
  defaultsRowClass,
  groupBodyClass,
  groupHeaderClass,
  leadColumnClass,
  padX,
  padY,
  stackGap,
  liveGroupClass,
  practiceGroupClass,
  trailColumnClass,
  type Message,
} from "./ui";

export default function LivestreamPage() {
  const [state, setState] = useState<AdminState | null>(null);
  const [schedule, setSchedule] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const res = await fetch("/api/admin/livestream");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    if (id !== requestId.current) return;
    setState(data);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("youtube_error");
    const connected = params.get("connected");
    if (error) setMessage({ type: "error", text: `YouTube connect failed: ${error}` });
    else if (connected) setMessage({ type: "success", text: "YouTube connected" });

    Promise.all([
      load(),
      fetch("/api/livestream")
        .then((res) => res.json())
        .then((data) => setSchedule(data.nextStream ?? null)),
    ])
      .catch(() => setMessage({ type: "error", text: "Failed to load current schedule" }))
      .finally(() => setLoading(false));

    const timer = setInterval(() => load().catch(() => undefined), 15000);
    return () => clearInterval(timer);
  }, [load]);

  const refresh = () => {
    load().catch((error) =>
      setMessage({ type: "error", text: `Failed to refresh: ${error.message}` }),
    );
  };

  const skeletonBar = "animate-pulse rounded bg-neutral-200 dark:bg-neutral-800";
  const skeletonColumn = (className: string, titled = true) => (
    <div className={`${padX} ${padY} ${stackGap} ${className}`}>
      {titled && <div className={`h-5 w-28 ${skeletonBar}`} />}
      <div className={`h-40 ${skeletonBar}`} />
      <div className={`h-24 ${skeletonBar}`} />
    </div>
  );
  const skeletonHeader = (
    <div className={groupHeaderClass}>
      <div className={`h-5 w-56 ${skeletonBar}`} />
    </div>
  );

  return (
    <div className="[@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:h-[calc(100dvh-var(--admin-header-h))] [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-col [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:overflow-hidden">
      {loading || !state ? (
        <>
          <div className={defaultsRowClass}>
            <div className={`h-5 w-72 ${skeletonBar}`} />
          </div>
          <div className={columnsClass}>
            <div className={liveGroupClass}>
              {skeletonHeader}
              <div className={groupBodyClass}>
                {skeletonColumn(leadColumnClass)}
                {skeletonColumn(trailColumnClass, false)}
              </div>
            </div>
            <div className={practiceGroupClass}>
              {skeletonHeader}
              <div className={groupBodyClass}>{skeletonColumn(trailColumnClass, false)}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          {message && (
            <div className="shrink-0 px-4 pt-4 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:px-6 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:pt-3">
              <Notice message={message} />
            </div>
          )}
          <DefaultsRow settings={state.settings} onSaved={refresh} />
          <div className={columnsClass}>
            <div className={liveGroupClass}>
              <GroupHeader name="Live" {...state.status.live} />
              <div className={groupBodyClass}>
                <div className={leadColumnClass}>
                  <NextStreamForm settings={state.settings} schedule={schedule} onSaved={refresh} />
                </div>
                <div className={trailColumnClass}>
                  <Destinations
                    account="main"
                    kind="public"
                    state={state}
                    now={now}
                    onSaved={refresh}
                  />
                </div>
              </div>
            </div>
            <div className={practiceGroupClass}>
              <GroupHeader name="Rehearsal" {...state.status.rehearsal} />
              <div className={groupBodyClass}>
                <div className={trailColumnClass}>
                  <Destinations
                    account="practice"
                    kind="practice"
                    state={state}
                    now={now}
                    onSaved={refresh}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
