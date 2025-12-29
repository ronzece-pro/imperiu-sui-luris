"use client";

import { useEffect, useState } from "react";
import { BADGES, getBadgeLabel, type UserBadge } from "@/lib/users/badges";

interface UserRow {
  id: string;
  name: string;
  email: string;
  badge: UserBadge;
  badgeLabel: string;
  role: string;
  citizenship: string;
  createdAt: string;
}

interface Props {
  onClose?: () => void;
}

export default function AdminUserManagement({ onClose }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setUsers([]);
        return;
      }

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data?.success) {
        setUsers([]);
        return;
      }

      const apiUsers = data.data as Array<{
        id: string;
        email: string;
        username: string;
        fullName: string;
        citizenship: string;
        role: string;
        badge: UserBadge;
        badgeLabel?: string;
        createdAt: string | Date;
      }>;

      setUsers(
        apiUsers.map((u) => ({
          id: u.id,
          name: u.fullName || u.username || u.email,
          email: u.email,
          role: u.role,
          citizenship: u.citizenship,
          badge: u.badge,
          badgeLabel: u.badgeLabel || getBadgeLabel(u.badge),
          createdAt: new Date(u.createdAt).toISOString().split("T")[0],
        }))
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const updateUserBadge = async (userId: string, badge: UserBadge) => {
    try {
      setSavingUserId(userId);
      setMessage("");

      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Trebuie să fii logat ca admin");
        return;
      }

      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, badge }),
      });

      const data = await response.json();
      if (!data?.success) {
        setMessage(data?.error || "Eroare la salvare");
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, badge, badgeLabel: data.data?.badgeLabel || getBadgeLabel(badge) }
            : u
        )
      );

      setMessage("Insigna a fost actualizată");
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      console.error("Error updating badge:", error);
      setMessage("Eroare la salvare");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <input
          type="text"
          placeholder="Căutare după nume sau email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : (
          <div className="overflow-x-auto">
            {message && (
              <div
                className={`px-4 py-3 text-sm border-b border-gray-800 ${
                  message.includes("actualiz") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
                }`}
              >
                {message}
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nume</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Insignă</th>
                  <th className="px-4 py-3 text-left font-semibold">Cetățenie</th>
                  <th className="px-4 py-3 text-left font-semibold">Creat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 font-medium">
                      {user.name}
                      {user.role === "admin" && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-900 text-blue-200">admin</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.badge}
                        onChange={(e) => updateUserBadge(user.id, e.target.value as UserBadge)}
                        disabled={savingUserId === user.id}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:bg-gray-900"
                      >
                        {BADGES.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Curent: {user.badgeLabel}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.citizenship}</td>
                    <td className="px-4 py-3 text-gray-400">{user.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
