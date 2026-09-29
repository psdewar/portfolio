"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PendingRsvpProvider, ShowRow } from "../components/ShowRow";
import { LiveClips, type EnergyClipHandlers } from "./LiveClips";
import { LiveSupportAsk, type LiveSupportAskCore } from "./LiveSupportAsk";
import { StoryColumn } from "./ChatRail";

const PAST_COL_SLOT_PX = 492;

export function pastShowColumnCount(containerWidthPx: number) {
  return Math.max(3, Math.floor((containerWidthPx + 12) / PAST_COL_SLOT_PX));
}

function pastShowGridK(gapAbovePx: number, rowHeightPx: number, n: number) {
  if (rowHeightPx <= 0) return 0;
  return Math.min(Math.max(0, Math.ceil(gapAbovePx / rowHeightPx)), n);
}

function chunkPastShowColumns(n: number, k: number, colCount: number): number[] {
  if (n === 0 || colCount <= 0) return new Array(Math.max(colCount, 0)).fill(0);
  const rest = Math.max(0, n - k);
  const col1Above = Math.ceil(rest / colCount);
  const col1 = k + col1Above;
  const remaining = rest - col1Above;
  const otherCount = colCount - 1;
  const counts = [col1];
  if (otherCount > 0) {
    const base = Math.floor(remaining / otherCount);
    let extra = remaining - base * otherCount;
    for (let i = 0; i < otherCount; i++) {
      counts.push(base + (extra > 0 ? 1 : 0));
      if (extra > 0) extra--;
    }
  }
  return counts;
}

export interface LiveBandProps {
  supportAsk: LiveSupportAskCore;
  energyClip: EnergyClipHandlers;
  isDesktop: boolean | null;
  isShortViewport: boolean;
  onFirstScreenMeasured: (px: number) => void;
  onBandFloorMeasured?: (px: number) => void;
}

export function LiveBand({
  supportAsk,
  energyClip,
  isDesktop,
  isShortViewport,
  onFirstScreenMeasured,
  onBandFloorMeasured,
}: LiveBandProps) {
  const clipsRowRef = useRef<HTMLDivElement>(null);
  const [clipsRowHeightPx, setClipsRowHeightPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = clipsRowRef.current;
    if (!el) return;
    const update = () => setClipsRowHeightPx(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scheduleBoxRef = useRef<HTMLDivElement>(null);
  const [scheduleHeightPx, setScheduleHeightPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = scheduleBoxRef.current;
    if (!el) return;
    const update = () => setScheduleHeightPx(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pastShowsAll = isShortViewport ? [] : supportAsk.pastShows ?? [];

  const pastRowsRef = useRef<HTMLDivElement>(null);
  const [pastRowsWidthPx, setPastRowsWidthPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = pastRowsRef.current;
    if (!el) return;
    const update = () => setPastRowsWidthPx(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pastShowsAll.length > 0]);

  const pastRowsCol1Ref = useRef<HTMLDivElement>(null);
  const [pastRowHeightPx, setPastRowHeightPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const first = pastRowsCol1Ref.current?.firstElementChild as HTMLElement | null | undefined;
    if (!first) return;
    const update = () => setPastRowHeightPx(first.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(first);
    return () => ro.disconnect();
  }, [pastShowsAll.length]);

  const pastShowsMeasured =
    scheduleHeightPx != null && clipsRowHeightPx != null && pastRowHeightPx != null && pastRowsWidthPx != null;
  const pastColCount = pastRowsWidthPx != null ? pastShowColumnCount(pastRowsWidthPx) : 3;
  const pastGapAbovePx =
    scheduleHeightPx != null && clipsRowHeightPx != null ? Math.max(0, clipsRowHeightPx - scheduleHeightPx) : 0;
  const pastGridK = pastRowHeightPx != null ? pastShowGridK(pastGapAbovePx, pastRowHeightPx, pastShowsAll.length) : 0;
  const pastCounts = pastShowsMeasured
    ? chunkPastShowColumns(pastShowsAll.length, pastGridK, pastColCount)
    : [pastShowsAll.length, ...new Array(Math.max(pastColCount - 1, 0)).fill(0)];
  const pastShowsCols: (typeof pastShowsAll)[] = [];
  let pastShowsCursor = 0;
  for (const count of pastCounts) {
    pastShowsCols.push(pastShowsAll.slice(pastShowsCursor, pastShowsCursor + count));
    pastShowsCursor += count;
  }
  const pastCol1MarginTopPx = pastShowsMeasured ? -pastGapAbovePx : 0;
  const pastOtherColMarginTopPx =
    pastShowsMeasured && pastRowHeightPx != null ? pastGridK * pastRowHeightPx - pastGapAbovePx : 0;

  return (
    <PendingRsvpProvider>
      <div data-live-band className="min-w-0 flex gap-3 items-start px-3 shrink-0">
        <div className="flex-1 min-w-0 max-w-[480px] flex flex-col">
          <div ref={scheduleBoxRef} data-live-schedule className="bg-neutral-50 dark:bg-black">
            <LiveSupportAsk
              {...supportAsk}
              pastShows={[]}
              onFirstScreenMeasured={onFirstScreenMeasured}
              onBandFloorMeasured={onBandFloorMeasured}
              flow
            />
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div ref={clipsRowRef} data-live-clips className="overflow-x-auto">
            <LiveClips active={isDesktop === true} {...energyClip} className="w-full" flush />
          </div>
        </div>
        <div className="flex-1 min-w-0 max-w-[480px] flex flex-col">
          <div data-live-story className="overflow-y-auto" style={{ height: clipsRowHeightPx ?? undefined }}>
            <StoryColumn />
          </div>
        </div>
      </div>
      {pastShowsAll.length > 0 && (
        <div ref={pastRowsRef} data-live-past-shows className="min-w-0 flex gap-3 px-3 shrink-0">
          {pastShowsCols.map((events, i) => (
            <div
              key={i}
              ref={i === 0 ? pastRowsCol1Ref : undefined}
              data-live-past-col={String(i + 1)}
              className="flex-1 min-w-0 max-w-[480px] px-4 pb-3 flex flex-col shrink-0"
              style={{ marginTop: i === 0 ? pastCol1MarginTopPx : pastOtherColMarginTopPx }}
            >
              {events.map((event) => (
                <ShowRow key={event.id} event={event} />
              ))}
            </div>
          ))}
        </div>
      )}
    </PendingRsvpProvider>
  );
}
