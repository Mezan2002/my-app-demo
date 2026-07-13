"use client";

import Link from "next/link";

import { Button, Input } from "@/components/ui";
import apiClient from "@/lib/axios";
import { setAccessToken } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = e.target;
    const formData = {
      email: email.value,
      password: password.value,
    };
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/auth/login", formData);
      setAccessToken(response.data.data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      console.log("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div>
        <h3>Login</h3>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Input type="email" name="email" placeholder="Enter your email" />
          <Input
            type="password"
            name="password"
            placeholder="Enter your password"
          />
          <Button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            {isLoading ? "Logging in" : "Login"}
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <Link href="/register" className="text-blue-500 hover:underline">
          Don&apos;t have an account? Register here
        </Link>
      </div>
    </section>
  );
};

export default LoginPage;
