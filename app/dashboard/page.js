"use client";

import { Button } from "@/components/ui";
import apiClient from "@/lib/axios";
import { getAccessToken } from "@/lib/utils";
import { useEffect, useState } from "react";

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await apiClient.get("/auth/profile");
        setUser(response.data.data.user);
      } catch (err) {
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleRefreshTest = async () => {
    try {
      const response = await apiClient.get("/auth/profile");
      setUser(response.data.data.user);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <section className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h3>Dashboard</h3>
      {user && (
        <>
          <p>Welcome, {user.name}</p>
          <p>Email: {user.email}</p>
        </>
      )}
      <Button
        onClick={handleRefreshTest}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Test Auth Profile (Click after 30s)
      </Button>
      <Button
        onClick={() => {
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        }}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </Button>
    </section>
  );
};

export default DashboardPage;
