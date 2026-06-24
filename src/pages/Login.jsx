import { useState } from "react";

function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = "http://192.168.9.45:7000/api/Auth/login";

  const getUserIdFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub || "";
    } catch {
      return "";
    }
  };

  const getUserFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      return {
        id: payload.sub || "",
        userName:
          payload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
          ] || userName,
        email:
          payload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
          ] || "",
        role: payload.role || "",
      };
    } catch {
      return {
        id: "",
        userName,
        email: "",
        role: "",
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const loginData = {
      userName,
      password,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
        },
        body: JSON.stringify(loginData),
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (!response.ok) {
        setMessage("❌ " + (result.message || text || "Login failed"));
        setIsSuccess(false);
        return;
      }

      const user = getUserFromToken(result.accessToken);
      const userId = getUserIdFromToken(result.accessToken);

      localStorage.setItem("accessToken", result.accessToken || "");
      localStorage.setItem("refreshToken", result.refreshToken || "");
      localStorage.setItem("expireAt", result.expireAt || "");
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userId", userId);

      // Optional old keys support
      localStorage.setItem("token", result.accessToken || "");

      if (result.expireAt) {
        localStorage.setItem(
          "token_expiry",
          new Date(result.expireAt).getTime().toString()
        );
      }

      setMessage("✅ Login successful!");
      setIsSuccess(true);

      setUserName("");
      setPassword("");

      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (err) {
      console.error("Login error:", err);
      setMessage("❌ Cannot connect to server. Check API URL or CORS.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="hidden md:block md:w-1/2 relative">
          <img
            src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=60"
            alt="Login"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40 flex items-end p-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
              <p className="text-gray-200 mt-2 text-sm">
                Login to manage your ExportFlow dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gray-900 flex items-center justify-center text-white text-xl font-bold">
              E
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
              LOGIN
            </h1>

            <p className="mt-2 text-gray-500 text-sm">
              Login to use our services.
            </p>

            {message && (
              <p
                className={`mt-4 text-sm font-medium ${
                  isSuccess ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Username
              </label>

              <input
                type="text"
                placeholder="Enter your username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-gray-700 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-gray-700 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-3 rounded-xl mt-4 transition font-semibold ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-700"
              }`}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* <div className="bg-gray-100 rounded-xl p-3 text-center text-xs sm:text-sm text-gray-600">
              Login: <b>admin</b> / <b>12345</b>
            </div> */}

            {/* <p className="text-center text-gray-600 text-sm">
              Don't have an account?{" "}
              <a href="/register" className="text-blue-600 hover:underline">
                Register here
              </a>
            </p> */}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;