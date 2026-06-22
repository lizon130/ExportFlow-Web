import { useState } from "react";

function Registration() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent page reload

    // Create DTO object
    const registerData = {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    };

    try {
      const response = await fetch("http://localhost:5142/api/users/register", {
        
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registerData),
        credentials: "include" // only if your API uses cookies/auth
      });

      if (response.ok) {
        const result = await response.text();
        setMessage("✅ Registration successful! " + result); // Add success indicator
        setIsSuccess(true);
        
        // Optional: clear form
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.text();
        setMessage("❌ " + error); // Add error indicator
        setIsSuccess(false);
      }
    } catch (err) {
      console.error(err);
      setMessage("An error occurred. Try again.");
    }
  };

  return (
    <div className="py-40 min-h-screen bg-gray-400">
      <div className="container mx-auto">
        <div className="w-8/12 bg-white rounded-lg shadow-lg flex mx-auto overflow-hidden">
          {/* Left Image */}
          <div className="w-1/2">
            <img
              src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=60"
              alt="Registration"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Right Form */}
          <div className="w-1/2 p-8">
            <div className="justify-center flex flex-col items-center mb-6">
              <h1 className="text-4xl font-bold text-gray-400">REGISTRATION</h1>
              <p className="mb-6 text-gray-400 text-sm">
                Create an account to get started with our services.
              </p>
              {message && <p className={`mb-4 ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
                {message}
              </p>}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border rounded-md p-2 w-full mt-3 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border rounded-md p-2 w-full mt-3 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border rounded-md p-2 w-full mt-3 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
              />

              <div className="grid grid-cols-2 gap-3 mt-3">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border rounded-md p-2 w-full mt-3 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border rounded-md p-2 w-full mt-3 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-600 text-white py-2 rounded-md mt-6 hover:bg-gray-800 transition"
              >
                Register
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Registration;
