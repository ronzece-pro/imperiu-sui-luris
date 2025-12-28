"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

interface DashboardUser {
  fullName: string;
  citizenship: string;
}

interface DashboardDoc {
  id: string;
  type: string;
  documentNumber: string;
  status: string;
}

interface DashboardLand {
  id: string;
  name: string;
  location: string;
  areaSize: number;
  type: string;
}

interface DashboardStats {
  documentCount: number;
  totalLandArea: number;
  propertyCount: number;
}

interface UserData {
  user: DashboardUser;
  documents: DashboardDoc[];
  landProperties: DashboardLand[];
  stats: DashboardStats;
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const raw: unknown = await response.json();
        const data = raw as { success?: boolean; data?: UserData; error?: string; message?: string };
        if (data.success && data.data) {
          setUserData(data.data);
        } else {
          setError(data.error || data.message || "Error loading dashboard");
        }
      } catch {
        setError("Error loading dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-white text-xl">Se încarcă...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-red-400">{error}</div>
        </div>
      </>
    );
  }

  if (!userData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-white text-xl">No data found</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">
              Bun venit, {userData.user.fullName}!
            </h1>
            <p className="text-gray-400">
              Status cetățenie:{" "}
              <span className="text-cyan-300 font-semibold">
                {userData.user.citizenship === "active" ? "Activ" : "Pending"}
              </span>
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Documente Deținute</h3>
              <p className="text-3xl font-bold text-cyan-300">
                {userData.stats.documentCount}
              </p>
            </div>
            <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Teren Deținut</h3>
              <p className="text-3xl font-bold text-cyan-300">
                {userData.stats.totalLandArea.toLocaleString()} m²
              </p>
            </div>
            <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
              <h3 className="text-gray-400 text-sm mb-2">Proprietăți</h3>
              <p className="text-3xl font-bold text-cyan-300">
                {userData.stats.propertyCount || 0}
              </p>
            </div>
          </div>

          {/* Documents Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Documente</h2>
            {userData.documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6"
                  >
                    <h3 className="text-white font-semibold mb-2 capitalize">
                      {doc.type}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      #{doc.documentNumber}
                    </p>
                    <p className="text-cyan-300">
                      Status: <span className="text-white">{doc.status}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6 text-center">
                <p className="text-gray-400">
                  Nu ai documente deocamdată.{" "}
                  <a href="/marketplace" className="text-blue-400 hover:text-blue-300">
                    Mergi la piață
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Land Properties Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Proprietăți Teren</h2>
            {userData.landProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userData.landProperties.map((land) => (
                  <div
                    key={land.id}
                    className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6"
                  >
                    <h3 className="text-white font-semibold mb-2">{land.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{land.location}</p>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-400">Arie:</span>{" "}
                        <span className="text-cyan-300">
                          {land.areaSize.toLocaleString()} m²
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-400">Tip:</span>{" "}
                        <span className="text-cyan-300 capitalize">{land.type}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white bg-opacity-5 backdrop-blur-sm border border-slate-700 rounded-lg p-6 text-center">
                <p className="text-gray-400">
                  Nu deții teren deocamdată. Suportă misiunea noastră!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
