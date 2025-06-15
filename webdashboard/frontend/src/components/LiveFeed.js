import React from 'react'; 
import { VIDEO_FEED_URL } from '../config';

function LiveFeed() {
  return (
    <div>
      <h2>Live Feed</h2>
      <img src={VIDEO_FEED_URL} width="640" height="480" alt="Live Feed" />
    </div>
  );
}

export default LiveFeed;
