import React, { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [currentQ, setCurrentQ] = useState(null);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState(null);

  const [students, setStudents] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [pollHistory, setPollHistory] = useState([]);

  useEffect(() => {
    const savedName = sessionStorage.getItem("studentName");
    if (savedName) {
      setName(savedName);
      setIsNameSet(true);
      socket.emit("register-student", savedName);
    }

    socket.on("connect", () => {
      console.log("🟢 Connected:", socket.id);
    });

    socket.on("new-question", (data) => {
      setCurrentQ(data);
      setResults(null);
      setAnswer("");
    });

    socket.on("poll-results", (data) => {
      setResults(data);
    });

    socket.on("student-list", (list) => {
      setStudents(list);
    });

    socket.on("chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("kicked", () => {
      alert("You were kicked by the teacher.");
      window.location.reload();
    });

    socket.on("poll-history", (history) => {
      setPollHistory(history);
    });

    return () => {
      socket.off("connect");
      socket.off("new-question");
      socket.off("poll-results");
      socket.off("student-list");
      socket.off("chat-message");
      socket.off("kicked");
      socket.off("poll-history");
    };
  }, []);

  const handlePoll = () => {
    socket.emit("ask-question", {
      question,
      options,
      totalStudents: students.length || 1,
      duration: 60000,
    });
    setQuestion("");
    setOptions(["", ""]);
  };

  const submitAnswer = () => {
    socket.emit("submit-answer", { name, answer });
  };

  const sendChat = () => {
    if (chatInput.trim()) {
      socket.emit("chat-message", { from: name, text: chatInput });
      setChatInput("");
    }
  };

  const fetchHistory = () => {
    socket.emit("get-history");
  };

  const handleKick = (id) => {
    socket.emit("kick-student", id);
  };

  // === RENDER FLOW ===

  if (!role) {
    return (
      <div>
        <h2>Select Role</h2>
        <button onClick={() => setRole("teacher")}>Teacher</button>
        <button onClick={() => setRole("student")}>Student</button>
      </div>
    );
  }

  if (role === "student" && !isNameSet) {
    return (
      <div>
        <h3>Enter your name</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button
          onClick={() => {
            if (name.trim()) {
              sessionStorage.setItem("studentName", name);
              socket.emit("register-student", name);
              setIsNameSet(true);
            }
          }}
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Live Polling System</h1>
      <h2>You are a {role}</h2>

      {/* Teacher UI */}
      {role === "teacher" && (
        <>
          <h3>Create Poll</h3>
          <input
            placeholder="Enter your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((opt, idx) => (
            <input
              key={idx}
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={(e) => {
                const newOpts = [...options];
                newOpts[idx] = e.target.value;
                setOptions(newOpts);
              }}
            />
          ))}
          <button onClick={handlePoll}>Start Poll</button>

          <h3>Connected Students</h3>
          <ul>
            {students.map((s) => (
              <li key={s.id}>
                {s.name}{" "}
                <button onClick={() => handleKick(s.id)}>Kick</button>
              </li>
            ))}
          </ul>

          <h3>Poll History</h3>
          <button onClick={fetchHistory}>Show Poll History</button>
          <ul>
            {pollHistory.map((poll, idx) => (
              <li key={idx}>
                <strong>{poll.question}</strong>
                <ul>
                  {Object.entries(poll.responses).map(([user, ans]) => (
                    <li key={user}>
                      {user}: {ans}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Student View */}
      {role === "student" && currentQ && !results && (
        <>
          <h3>{currentQ.question}</h3>
          {currentQ.options.map((opt, idx) => (
            <div key={idx}>
              <input
                type="radio"
                id={opt}
                name="answer"
                value={opt}
                onChange={() => setAnswer(opt)}
              />
              <label htmlFor={opt}>{opt}</label>
            </div>
          ))}
          <button onClick={submitAnswer} disabled={!answer}>
            Submit
          </button>
        </>
      )}

      {/* Results */}
      {results && (
        <>
          <h3>Results</h3>
          <ul>
            {Object.entries(results).map(([user, ans]) => (
              <li key={user}>
                {user}: {ans}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Chat */}
      <div style={{ borderTop: "1px solid #ccc", marginTop: 20, paddingTop: 10 }}>
        <h3>Chat</h3>
        <div
          style={{
            maxHeight: 150,
            overflowY: "auto",
            border: "1px solid gray",
            padding: 10,
            marginBottom: 10,
            background: "#f9f9f9",
          }}
        >
          {chatMessages.map((msg, idx) => (
            <div key={idx}>
              <strong>{msg.from}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={sendChat}>Send</button>
      </div>
    </div>
  );
}

export default App;
