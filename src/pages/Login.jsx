import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = "http://192.168.9.45:7000/api/Auth/login";

  /*
    Load saved login credentials when the page opens.
  */
  useEffect(() => {
    try {
      const savedRememberMe =
        localStorage.getItem("rememberMe") === "true";

      if (!savedRememberMe) return;

      const savedUserName =
        localStorage.getItem("rememberedUserName") || "";

      const savedPassword =
        localStorage.getItem("rememberedPassword") || "";

      setUserName(savedUserName);
      setPassword(savedPassword);
      setRememberMe(true);
    } catch (error) {
      console.error("Unable to load remembered login:", error);
    }
  }, []);

  const decodeTokenPayload = (token) => {
    try {
      if (!token || !token.includes(".")) return {};

      const base64Url = token.split(".")[1];

      const base64 = base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const paddedBase64 = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "="
      );

      return JSON.parse(atob(paddedBase64));
    } catch (error) {
      console.error("Token decode error:", error);
      return {};
    }
  };

  const getUserIdFromToken = (token) => {
    const payload = decodeTokenPayload(token);

    return (
      payload.sub ||
      payload.nameid ||
      payload.userId ||
      payload.id ||
      ""
    );
  };

  const getUserFromToken = (token) => {
    const payload = decodeTokenPayload(token);

    return {
      id:
        payload.sub ||
        payload.nameid ||
        payload.userId ||
        payload.id ||
        "",

      userName:
        payload[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        ] ||
        payload.name ||
        payload.unique_name ||
        userName,

      email:
        payload[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
        ] ||
        payload.email ||
        "",

      role:
        payload[
          "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ] ||
        payload.role ||
        "",
    };
  };

  const saveRememberedCredentials = () => {
    try {
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedUserName", userName);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedUserName");
        localStorage.removeItem("rememberedPassword");
      }
    } catch (error) {
      console.error("Unable to save remembered login:", error);
    }
  };

  const handleRememberMeChange = (event) => {
    const isChecked = event.target.checked;

    setRememberMe(isChecked);

    /*
      Immediately remove saved credentials when unchecked.
    */
    if (!isChecked) {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedUserName");
      localStorage.removeItem("rememberedPassword");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userName.trim() || !password) {
      setMessage("❌ Please enter username and password.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify({
          userName: userName.trim(),
          password,
        }),
      });

      const responseText = await response.text();

      let result = {};

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        result = {
          message: responseText,
        };
      }

      if (!response.ok) {
        setMessage(
          "❌ " +
            (result?.message ||
              responseText ||
              "Invalid username or password")
        );

        setIsSuccess(false);
        return;
      }

      if (!result?.accessToken) {
        setMessage("❌ Access token was not returned by the server.");
        setIsSuccess(false);
        return;
      }

      const user = getUserFromToken(result.accessToken);
      const userId = getUserIdFromToken(result.accessToken);

      localStorage.setItem(
        "accessToken",
        result.accessToken || ""
      );

      localStorage.setItem(
        "refreshToken",
        result.refreshToken || ""
      );

      localStorage.setItem(
        "expireAt",
        result.expireAt || ""
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      localStorage.setItem(
        "userId",
        String(userId || "")
      );

      /*
        Keep this old key if other parts of your application use it.
      */
      localStorage.setItem(
        "token",
        result.accessToken || ""
      );

      if (result.expireAt) {
        const expiryTime = new Date(
          result.expireAt
        ).getTime();

        if (!Number.isNaN(expiryTime)) {
          localStorage.setItem(
            "token_expiry",
            expiryTime.toString()
          );
        }
      }

      /*
        Save or remove remembered login credentials.
      */
      saveRememberedCredentials();

      setMessage("Login successful! ✅");
      setIsSuccess(true);

      /*
        Do not clear inputs when Remember Me is checked.
      */
      if (!rememberMe) {
        setUserName("");
        setPassword("");
      }

      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "❌ Cannot connect to server. Check the API URL, network, or CORS configuration."
      );

      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Image Section */}
        <div className="hidden md:block md:w-1/2 relative">
          <img
            src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=60"
            alt="ExportFlow Login"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40 flex items-end p-8">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Welcome Back
              </h2>

              <p className="text-gray-200 mt-2 text-sm">
                Login to manage your ExportFlow dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gray-200 flex items-center justify-center">
              <img
                src="/favicon.png"
                alt="ExportFlow Logo"
                className="h-10 w-10 rounded-xl object-contain p-1"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
              LOGIN
            </h1>

            <p className="mt-2 text-gray-500 text-sm">
              Login to use our services.
            </p>

            {message && (
              <div
                role="alert"
                className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
                  isSuccess
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Username */}
            <div>
              <label
                htmlFor="userName"
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                Username
              </label>

              <input
                id="userName"
                name="userName"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={userName}
                onChange={(event) =>
                  setUserName(event.target.value)
                }
                disabled={loading}
                className="border border-gray-300 rounded-xl px-4 py-3 w-full text-sm transition focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  disabled={loading}
                  className="border border-gray-300 rounded-xl px-4 py-3 pr-12 w-full text-sm transition focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-gray-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previousValue) =>
                        !previousValue
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border-none p-0 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                  disabled={loading}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-gray-900 focus:ring-2 focus:ring-gray-400 disabled:cursor-not-allowed"
                />

                <span className="text-sm font-medium text-gray-600">
                  Remember me
                </span>
              </label>

              {rememberMe && (
                <span className="text-xs font-medium text-green-600">
                  Credentials will be remembered
                </span>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white py-3 rounded-xl mt-4 transition font-semibold ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-700 active:bg-gray-950"
              }`}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;