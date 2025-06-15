import React, { useEffect, useRef } from 'react';
import { ALERT_EVENTS_URL } from '../config';

function AlertSound() {
  const audioRef = useRef();

  useEffect(() => {
    const source = new EventSource(ALERT_EVENTS_URL);
    source.onmessage = (e) => {
      if (e.data === "intrusion") {
        audioRef.current.play().catch(err => console.warn("Audio error:", err));
      }
    };
    return () => source.close();
  }, []);

  return <audio ref={audioRef} src="/alert.ogg" preload="auto" />;
}

export default AlertSound;
