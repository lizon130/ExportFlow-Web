import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    const staticEmail = "admin@gmail.com";
    const staticPassword = "123456";

    if (email === staticEmail && password === staticPassword) {
      setMessage("✅ Login successful!");
      setIsSuccess(true);

      const user = {
        id: 1,
        name: "Admin",
        email: staticEmail,
        role: "Admin",
      };

      localStorage.setItem("token", "static-login-token");
      localStorage.setItem("user", JSON.stringify(user));

      const tokenExpiry = new Date().getTime() + 3 * 60 * 60 * 1000;
      localStorage.setItem("token_expiry", tokenExpiry.toString());

      setEmail("");
      setPassword("");

      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } else {
      setMessage("❌ Invalid email or password");
      setIsSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Image */}
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

        {/* Right Form */}
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
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              className="w-full bg-gray-900 text-white py-3 rounded-xl mt-4 hover:bg-gray-700 transition font-semibold"
            >
              Login
            </button>

            <div className="bg-gray-100 rounded-xl p-3 text-center text-xs sm:text-sm text-gray-600">
              Static Login: <b>admin@gmail.com</b> / <b>123456</b>
            </div>

            <p className="text-center text-gray-600 text-sm">
              Don't have an account?{" "}
              <a href="/register" className="text-blue-600 hover:underline">
                Register here
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;