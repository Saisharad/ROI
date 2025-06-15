import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveStatus, setLiveStatus] = useState("clear");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:5000/events");
    eventSource.onmessage = (e) => {
      setLiveStatus(e.data);
      if (e.data === "intrusion") {
        const audio = new Audio("/alert.mp3");
        audio.play().catch((err) => console.error("Audio play failed:", err));
      }
    };
    return () => eventSource.close();
  }, []);

  const fetchSnapshots = async (date = "") => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`http://localhost:5000/snapshots${date ? `?date=${date}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      const data = await res.json();
      setSnapshots(data);
    } catch (err) {
      console.error("Error fetching snapshots:", err);
      setError("Unable to load snapshots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchSnapshots();
  }, [currentUser]);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await logout();
      navigate("/login");
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchSnapshots(date);
  };

  return (
    <div className="dashboard p-4">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Welcome, {currentUser?.email}
        </h2>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </header>

      <section className="mb-10">
        <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
          🔴 Live Feed
          <span
            className={`text-sm px-2 py-1 rounded ${
              liveStatus === "intrusion"
                ? "bg-red-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {liveStatus === "intrusion" ? "Intrusion Detected" : "Clear"}
          </span>
        </h3>
        <img
          src="http://localhost:5000/video_feed"
          alt="Live Feed"
          className="w-full max-w-3xl border-2 border-gray-300"
          loading="lazy"
          onError={(e) => {
    e.target.onerror = null;
    e.target.src = "/no-feed.png"; // fallback image
  }}
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">🖼️ Snapshots</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="border px-2 py-1 rounded"
          />
        </div>

        {loading ? (
          <p>Loading snapshots...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : snapshots.length === 0 ? (
          <p>No intrusion snapshots recorded yet.</p>
        ) : (
          <div className="snapshot-grid flex flex-wrap">
            {snapshots.map((snap, index) => (
              <div key={index} className="m-2 border border-gray-400 p-2 rounded">
                <img
                  src={`http://localhost:5000${snap.url}`}
                  alt={`Snapshot ${index}`}
                  className="w-48 h-auto mb-2"
                />
                <p className="text-sm text-gray-700">{snap.timestamp}</p>
                <a
                  href={`http://localhost:5000${snap.url}`}
                  download
                  className="text-blue-600 hover:underline text-sm"
                >
                  ⬇️ Download
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
