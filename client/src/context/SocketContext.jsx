import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "";

    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      s.emit("addUser", user._id);
    });

    s.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider");
  return context;
};
