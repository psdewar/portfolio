import type { AdminState, InstagramKind } from "../../lib/livestream";
import InstagramBlock from "./InstagramBlock";
import YouTubeBlock from "./YouTubeBlock";
import { Card } from "./ui";

export default function Destinations({
  account,
  kind,
  state,
  now,
  onSaved,
}: {
  account: keyof AdminState["channels"];
  kind: InstagramKind;
  state: AdminState;
  now: number;
  onSaved: () => void;
}) {
  return (
    <Card>
      <YouTubeBlock
        account={account}
        channel={state.channels[account]}
        settings={state.settings}
        onSaved={onSaved}
      />
      <div className="pt-3 [@media(min-width:1600px)_and_(min-height:900px)]:pt-4">
        <InstagramBlock kind={kind} savedAt={state.instagram[kind]} now={now} onSaved={onSaved} />
      </div>
    </Card>
  );
}
