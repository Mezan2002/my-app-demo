"use client";

import Link from "next/link";

import { Button, Input } from "@/components/ui";
import apiClient from "@/lib/axios";
import { setAccessToken } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password } = e.target;
    const formData = {
      name: name.value,
      email: email.value,
      password: password.value,
    };
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/auth/register", formData);
      const { accessToken } = response.data.data;
      setAccessToken(accessToken);
      router.push("/dashboard");
    } catch (error) {
      (setError(error.response?.data?.message || "Registration failed"),
        console.log("Registration error:", error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div>
        <h3>Register</h3>
        {error && <p className="text-red-500">{error}</p>}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Input type="text" name="name" placeholder="Enter your name" />
          <Input type="email" name="email" placeholder="Enter your email" />
          <Input
            type="password"
            name="password"
            placeholder="Enter your password"
          />
          <Button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {isLoading ? "Registering" : "Register"}
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <Link href="/login" className="text-blue-500 hover:underline">
          Already have an account? Login here
        </Link>
      </div>
    </section>
  );
};

export default RegisterPage;
