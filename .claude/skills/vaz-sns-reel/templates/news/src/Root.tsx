import { Composition, getInputProps, staticFile } from "remotion";
import { Reel, calcDurationFrames } from "./Reel";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  const props = getInputProps() as { captionsSrc?: string; audioSrc?: string };
  const captionsSrc = props.captionsSrc ?? "captions.json";
  const audioSrc = props.audioSrc ?? "voice.mp3";

  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={FPS * 30}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ captionsSrc, audioSrc }}
      calculateMetadata={async ({ props }) => {
        const url = staticFile(props.captionsSrc);
        const res = await fetch(url);
        const data = await res.json();
        return { durationInFrames: calcDurationFrames(data.durationSec, FPS) };
      }}
    />
  );
};
