import { Composition, getInputProps, staticFile } from "remotion";
import { IRVideo, calcDurationFrames } from "./IRVideo";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  const props = getInputProps() as {
    captionsSrc?: string;
    audioSrc?: string;
    metaSrc?: string;
  };
  const captionsSrc = props.captionsSrc ?? "captions.json";
  const audioSrc = props.audioSrc ?? "voice.mp3";
  const metaSrc = props.metaSrc ?? "meta.json";

  return (
    <Composition
      id="IRVideo"
      component={IRVideo}
      durationInFrames={FPS * 60}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ captionsSrc, audioSrc, metaSrc }}
      calculateMetadata={async ({ props }) => {
        const url = staticFile(props.captionsSrc);
        const res = await fetch(url);
        const data = await res.json();
        return { durationInFrames: calcDurationFrames(data.durationSec, FPS) };
      }}
    />
  );
};
