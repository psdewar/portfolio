import type { AdminState } from "../../lib/livestream";
import { SOCIAL_PLATFORMS, type SocialKind } from "../../lib/social-destinations";
import FacebookConnect from "./FacebookConnect";
import SocialBlock from "./SocialBlock";
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
  kind: SocialKind;
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
      {SOCIAL_PLATFORMS.map((platform) => (
        <div key={platform} className="pt-3 [@media(min-width:1600px)_and_(min-height:900px)]:pt-4">
          {platform === "facebook" && kind === "public" && (
            <div className="pb-3">
              <FacebookConnect facebook={state.facebook} onSaved={onSaved} />
            </div>
          )}
          <SocialBlock
            platform={platform}
            autoCreated={platform === "facebook" && state.facebook !== null}
            kind={kind}
            saved={state.destinations[platform][kind]}
            now={now}
            onSaved={onSaved}
          />
        </div>
      ))}
    </Card>
  );
}
