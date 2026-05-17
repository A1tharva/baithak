import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("baithak_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("baithak_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const registerUser = (data) => API.post("/api/auth/register", data);
export const loginUser = (data) => API.post("/api/auth/login", data);
export const getMe = () => API.get("/api/auth/me");
export const logoutUser = () => API.post("/api/auth/logout");

// Conversations
export const createOrGetConversation = (receiverId) =>
  API.post("/api/conversations", { receiverId });
export const getUserConversations = (userId) =>
  API.get(`/api/conversations/${userId}`);

// Messages
export const sendMessage = (data) => API.post("/api/messages", data);
export const getMessages = (conversationId) =>
  API.get(`/api/messages/${conversationId}`);
export const deleteMessage = (messageId) =>
  API.delete(`/api/messages/${messageId}`);

// Users
export const searchUsers = (q) => API.get(`/api/users/search?q=${q}`);
export const getUserById = (id) => API.get(`/api/users/${id}`);
export const updateProfile = (data) => API.put("/api/users/profile", data);

// Friends
export const searchFriends = (query) => API.get(`/api/friends/search?query=${query}`);
export const sendFriendRequest = (userId) => API.post(`/api/friends/request/${userId}`);
export const acceptFriendRequest = (requestId) => API.put(`/api/friends/accept/${requestId}`);
export const rejectFriendRequest = (requestId) => API.put(`/api/friends/reject/${requestId}`);
export const getIncomingRequests = () => API.get(`/api/friends/requests/incoming`);
export const getFriendsList = () => API.get(`/api/friends/list`);

export default API;
