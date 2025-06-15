import React, { useEffect, useState } from 'react';
import { SNAPSHOTS_API } from '../config';

function SnapshotGallery() {
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    fetch(SNAPSHOTS_API)
      .then(res => res.json())
      .then(data => setSnapshots(data))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2>Intrusion Snapshots</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {snapshots.map((snap, i) => (
          <img key={i} src={snap.url} alt={`Snapshot ${i}`} width="320" />
        ))}
      </div>
    </div>
  );
}

export default SnapshotGallery;
