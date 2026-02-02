import React from 'react';
import { Composition } from 'remotion';
import { AcroVideo, AcroVideoProps } from '../components/remotion/AcroVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<AcroVideoProps>
        id="AcroVideo"
        component={AcroVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          steps: [],
        }}
      />
    </>
  );
};
